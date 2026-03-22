import SwiftUI

@main
struct ChaucheroApp: App {
    @StateObject private var authStore = AuthStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authStore)
                .preferredColorScheme(.dark)
        }
    }
}
