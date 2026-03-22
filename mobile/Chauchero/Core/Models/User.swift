import Foundation

struct User: Codable {
    let email: String
    let name: String
    let lastSyncAt: String?

    enum CodingKeys: String, CodingKey {
        case email, name
        case lastSyncAt = "last_sync_at"
    }
}

struct AuthResponse: Codable {
    let accessToken: String
    let tokenType: String
    let user: User

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case tokenType   = "token_type"
        case user
    }
}
