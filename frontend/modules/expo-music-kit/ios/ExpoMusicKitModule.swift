import ExpoModulesCore
import MusicKit

public class ExpoMusicKitModule: Module {
  // Module definition
  public func definition() -> ModuleDefinition {
    Name("ExpoMusicKit")

    // Request Apple Music authorization
    AsyncFunction("requestAuthorization") { (promise: Promise) in
      Task {
        do {
          let status = await MusicAuthorization.request()

          switch status {
          case .authorized:
            // Get the music user token
            if let token = try? await MusicAuthorization.musicUserToken() {
              promise.resolve([
                "success": true,
                "status": "authorized",
                "musicUserToken": token
              ])
            } else {
              promise.reject("NO_TOKEN", "Authorization succeeded but could not get user token")
            }
          case .denied:
            promise.resolve([
              "success": false,
              "status": "denied"
            ])
          case .notDetermined:
            promise.resolve([
              "success": false,
              "status": "notDetermined"
            ])
          case .restricted:
            promise.resolve([
              "success": false,
              "status": "restricted"
            ])
          @unknown default:
            promise.resolve([
              "success": false,
              "status": "unknown"
            ])
          }
        } catch {
          promise.reject("AUTHORIZATION_ERROR", error.localizedDescription)
        }
      }
    }

    // Check current authorization status
    Function("getAuthorizationStatus") { () -> String in
      let status = MusicAuthorization.currentStatus
      switch status {
      case .authorized:
        return "authorized"
      case .denied:
        return "denied"
      case .notDetermined:
        return "notDetermined"
      case .restricted:
        return "restricted"
      @unknown default:
        return "unknown"
      }
    }

    // Get music user token (if already authorized)
    AsyncFunction("getMusicUserToken") { (promise: Promise) in
      Task {
        do {
          if MusicAuthorization.currentStatus == .authorized {
            if let token = try? await MusicAuthorization.musicUserToken() {
              promise.resolve(token)
            } else {
              promise.reject("NO_TOKEN", "Not able to retrieve music user token")
            }
          } else {
            promise.reject("NOT_AUTHORIZED", "User has not authorized Apple Music access")
          }
        }
      }
    }
  }
}
