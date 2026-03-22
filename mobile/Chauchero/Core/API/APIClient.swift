import Foundation

enum APIError: LocalizedError {
    case invalidURL
    case noToken
    case httpError(Int, String?)
    case decodingError(Error)
    case networkError(Error)

    var errorDescription: String? {
        switch self {
        case .invalidURL:             return "URL inválida"
        case .noToken:                return "No autenticado"
        case .httpError(401, _):      return "Sesión expirada. Vuelve a iniciar sesión."
        case .httpError(429, let m):  return m ?? "Demasiadas solicitudes. Espera un momento."
        case .httpError(409, _):      return "Sincronización en progreso."
        case .httpError(_, let m):    return m ?? "Error del servidor"
        case .decodingError:          return "Error procesando la respuesta"
        case .networkError:           return "Sin conexión a internet"
        }
    }

    var httpStatus: Int? {
        if case .httpError(let code, _) = self { return code }
        return nil
    }
}

final class APIClient {
    static let shared = APIClient()
    private init() {}

    // Update this to your deployed Railway URL or local dev URL
    #if DEBUG
    private let baseURL = "http://localhost:8000"
    #else
    private let baseURL = "https://chauchero-production.up.railway.app"
    #endif

    private let session: URLSession = {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        return URLSession(configuration: config)
    }()

    // MARK: - Generic request

    func request<T: Decodable>(
        _ path: String,
        method: String = "GET",
        token: String? = nil,
        body: (any Encodable)? = nil
    ) async throws -> T {
        guard let url = URL(string: baseURL + path) else {
            throw APIError.invalidURL
        }

        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body {
            req.httpBody = try JSONEncoder().encode(body)
        }

        let (data, response) = try await {
            do {
                return try await session.data(for: req)
            } catch {
                throw APIError.networkError(error)
            }
        }()

        guard let http = response as? HTTPURLResponse else {
            throw APIError.networkError(URLError(.badServerResponse))
        }

        guard (200..<300).contains(http.statusCode) else {
            let detail = try? JSONDecoder().decode(APIErrorBody.self, from: data)
            throw APIError.httpError(http.statusCode, detail?.detail)
        }

        do {
            let decoder = JSONDecoder()
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decodingError(error)
        }
    }

    // MARK: - Auth

    func exchangeCode(_ code: String) async throws -> AuthResponse {
        try await request("/auth/mobile/callback", method: "POST", body: ["code": code])
    }

    func getMe(token: String) async throws -> User {
        try await request("/auth/me", token: token)
    }

    // MARK: - Transactions

    func getTransactions(token: String, skip: Int = 0, limit: Int = 50) async throws -> TransactionListResponse {
        if token == "demo" {
            let page = Array(MockData.transactions.dropFirst(skip).prefix(limit))
            return TransactionListResponse(transactions: page, total: MockData.transactions.count)
        }
        return try await request("/transactions?skip=\(skip)&limit=\(limit)", token: token)
    }

    func getDashboard(token: String) async throws -> DashboardSummary {
        if token == "demo" { return MockData.summary }
        return try await request("/dashboard/summary", token: token)
    }

    func syncTransactions(token: String) async throws -> SyncResponse {
        if token == "demo" {
            try await Task.sleep(nanoseconds: 1_500_000_000)
            return SyncResponse(stats: SyncStats(emailsFetched: 12, transactionsCreated: 3, parsingErrors: 0), message: nil)
        }
        return try await request(
            "/transactions/sync?max_emails=200&force_full_sync=true",
            method: "POST",
            token: token
        )
    }

    func updateNote(token: String, transactionId: String, note: String) async throws -> Transaction {
        if token == "demo" {
            guard let tx = MockData.transactions.first(where: { $0.id == transactionId }) else {
                throw APIError.httpError(404, "Transacción no encontrada")
            }
            // Return same transaction — in demo notes aren't persisted
            return tx
        }
        return try await request(
            "/transactions/\(transactionId)",
            method: "PATCH",
            token: token,
            body: ["notes": note]
        )
    }
}

private struct APIErrorBody: Codable {
    let detail: String?
}
