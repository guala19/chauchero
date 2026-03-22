import SwiftUI
import Combine

@MainActor
final class AuthStore: ObservableObject {
    @Published private(set) var isAuthenticated: Bool = false
    @Published private(set) var currentUser: User?
    @Published private(set) var isDemoMode: Bool = false

    private let keychain = KeychainManager.shared

    init() {
        if let token = keychain.readToken(), !token.isEmpty {
            isAuthenticated = true
        }
    }

    var token: String? {
        isDemoMode ? "demo" : keychain.readToken()
    }

    func signIn(token: String, user: User) {
        try? keychain.saveToken(token)
        currentUser = user
        isDemoMode = false
        isAuthenticated = true
    }

    func signInDemo() {
        isDemoMode = true
        currentUser = MockData.user
        isAuthenticated = true
    }

    func signOut() {
        keychain.deleteToken()
        currentUser = nil
        isDemoMode = false
        isAuthenticated = false
    }

    func updateUser(_ user: User) {
        currentUser = user
    }
}
