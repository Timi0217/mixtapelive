import { prisma } from '../config/database';

export class FollowService {
  // Follow a curator
  static async followCurator(followerUserId: string, curatorUserId: string): Promise<any> {
    // Check if trying to follow self
    if (followerUserId === curatorUserId) {
      throw new Error('Cannot follow yourself');
    }

    // Check if curator exists and is actually a curator
    const curator = await prisma.user.findUnique({
      where: { id: curatorUserId },
      select: { id: true, accountType: true, username: true },
    });

    if (!curator) {
      throw new Error('Curator not found');
    }

    // Check if already following
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerUserId_curatorUserId: {
          followerUserId,
          curatorUserId,
        },
      },
    });

    if (existingFollow) {
      return existingFollow; // Already following
    }

    // Create follow relationship
    const follow = await prisma.follow.create({
      data: {
        followerUserId,
        curatorUserId,
      },
    });

    // Update curator's follower count in cache
    await this.updateCuratorFollowerCount(curatorUserId);

    return follow;
  }

  // Unfollow a curator
  static async unfollowCurator(followerUserId: string, curatorUserId: string): Promise<void> {
    await prisma.follow.delete({
      where: {
        followerUserId_curatorUserId: {
          followerUserId,
          curatorUserId,
        },
      },
    });

    // Update curator's follower count
    await this.updateCuratorFollowerCount(curatorUserId);
  }

  // Check if user is following curator
  static async isFollowing(followerUserId: string, curatorUserId: string): Promise<boolean> {
    const follow = await prisma.follow.findUnique({
      where: {
        followerUserId_curatorUserId: {
          followerUserId,
          curatorUserId,
        },
      },
    });

    return !!follow;
  }

  // Get user's following list (curators they follow)
  static async getFollowing(userId: string, limit: number = 100): Promise<any[]> {
    const follows = await prisma.follow.findMany({
      where: {
        followerUserId: userId,
      },
      include: {
        curator: {
          select: {
            id: true,
            username: true,
            displayName: true,
            profilePhotoUrl: true,
            profileEmoji: true,
            profileBackgroundColor: true,
            bio: true,
            genreTags: true,
            accountType: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    // Check which curators are currently live
    const curatorIds = follows.map(f => f.curatorUserId);
    const liveBroadcasts = await prisma.broadcast.findMany({
      where: {
        curatorId: { in: curatorIds },
        status: 'live',
      },
      select: {
        curatorId: true,
        id: true,
        startedAt: true,
      },
    });

    const liveBroadcastMap = new Map(
      liveBroadcasts.map(b => [b.curatorId, b])
    );

    return follows.map(follow => ({
      ...follow.curator,
      isLive: liveBroadcastMap.has(follow.curatorUserId),
      liveBroadcast: liveBroadcastMap.get(follow.curatorUserId) || null,
    }));
  }

  // Get curator's followers
  static async getFollowers(curatorUserId: string, limit: number = 100): Promise<any[]> {
    const follows = await prisma.follow.findMany({
      where: {
        curatorUserId,
      },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            displayName: true,
            profilePhotoUrl: true,
            accountType: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return follows.map(f => f.follower);
  }

  // Get follower count for a curator
  static async getFollowerCount(curatorUserId: string): Promise<number> {
    return await prisma.follow.count({
      where: {
        curatorUserId,
      },
    });
  }

  // Get following count for a user
  static async getFollowingCount(userId: string): Promise<number> {
    return await prisma.follow.count({
      where: {
        followerUserId: userId,
      },
    });
  }

  // Update curator's follower count in curator_balances table
  static async updateCuratorFollowerCount(curatorUserId: string): Promise<void> {
    const count = await this.getFollowerCount(curatorUserId);

    await prisma.curatorBalance.upsert({
      where: {
        curatorId: curatorUserId,
      },
      update: {
        totalFollowers: count,
      },
      create: {
        curatorId: curatorUserId,
        totalFollowers: count,
      },
    });
  }

  // Get suggested curators (for discovery)
  static async getSuggestedCurators(
    userId: string,
    genres?: string[],
    limit: number = 20
  ): Promise<any[]> {
    // Get curators the user is already following
    const following = await prisma.follow.findMany({
      where: {
        followerUserId: userId,
      },
      select: {
        curatorUserId: true,
      },
    });

    const followingIds = following.map(f => f.curatorUserId);

    // Build where clause
    const whereClause: any = {
      accountType: 'curator',
      id: {
        not: userId, // Don't suggest self
        notIn: followingIds, // Don't suggest already following
      },
    };

    // Filter by genres if provided
    if (genres && genres.length > 0) {
      whereClause.genreTags = {
        hasSome: genres,
      };
    }

    // Get curators with their stats
    const curators = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        username: true,
        displayName: true,
        profilePhotoUrl: true,
        profileEmoji: true,
        profileBackgroundColor: true,
        bio: true,
        genreTags: true,
        instagramHandle: true,
        curatorBalance: {
          select: {
            totalFollowers: true,
            totalBroadcastHours: true,
          },
        },
        broadcasts: {
          where: {
            status: 'live',
          },
          select: {
            id: true,
            startedAt: true,
          },
          take: 1,
        },
      },
      take: limit * 2, // Get more to sort and filter
    });

    // Sort by: currently live first, then by follower count
    const sorted = curators.sort((a, b) => {
      const aIsLive = a.broadcasts.length > 0 ? 1 : 0;
      const bIsLive = b.broadcasts.length > 0 ? 1 : 0;

      if (aIsLive !== bIsLive) {
        return bIsLive - aIsLive; // Live first
      }

      // Then by follower count
      const aFollowers = a.curatorBalance?.totalFollowers || 0;
      const bFollowers = b.curatorBalance?.totalFollowers || 0;
      return bFollowers - aFollowers;
    });

    return sorted.slice(0, limit).map(curator => ({
      id: curator.id,
      username: curator.username,
      displayName: curator.displayName,
      profilePhotoUrl: curator.profilePhotoUrl,
      profileEmoji: curator.profileEmoji,
      profileBackgroundColor: curator.profileBackgroundColor,
      bio: curator.bio,
      genreTags: curator.genreTags,
      instagramHandle: curator.instagramHandle,
      followerCount: curator.curatorBalance?.totalFollowers || 0,
      totalBroadcastHours: curator.curatorBalance?.totalBroadcastHours || 0,
      isLive: curator.broadcasts.length > 0,
      liveBroadcast: curator.broadcasts[0] || null,
    }));
  }

  // Search curators by username or display name
  static async searchCurators(query: string, limit: number = 20): Promise<any[]> {
    const curators = await prisma.user.findMany({
      where: {
        accountType: 'curator',
        OR: [
          {
            username: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            displayName: {
              contains: query,
              mode: 'insensitive',
            },
          },
        ],
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        profilePhotoUrl: true,
        profileEmoji: true,
        profileBackgroundColor: true,
        bio: true,
        genreTags: true,
        curatorBalance: {
          select: {
            totalFollowers: true,
          },
        },
      },
      take: limit,
      orderBy: [
        {
          curatorBalance: {
            totalFollowers: 'desc',
          },
        },
      ],
    });

    return curators.map(curator => ({
      ...curator,
      followerCount: curator.curatorBalance?.totalFollowers || 0,
    }));
  }
}
