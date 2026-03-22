import Foundation

struct Transaction: Identifiable, Codable, Hashable {
    let id: String
    let description: String
    let amount: Double
    let transactionType: TransactionType
    let transactionDate: String
    let parserConfidence: Int
    let emailSubject: String?
    let notes: String?

    enum TransactionType: String, Codable, Hashable {
        case debit = "debit"
        case transferDebit = "transfer_debit"
        case transferCredit = "transfer_credit"

        var displayName: String {
            switch self {
            case .debit:          return "Gasto"
            case .transferDebit:  return "Transferencia"
            case .transferCredit: return "Ingreso"
            }
        }

        var isIncome: Bool { self == .transferCredit }
    }

    enum CodingKeys: String, CodingKey {
        case id, description, amount, notes
        case transactionType    = "transaction_type"
        case transactionDate    = "transaction_date"
        case parserConfidence   = "parser_confidence"
        case emailSubject       = "email_subject"
    }
}

struct TransactionListResponse: Codable {
    let transactions: [Transaction]
    let total: Int
}

struct SyncStats: Codable {
    let emailsFetched: Int
    let transactionsCreated: Int
    let parsingErrors: Int?

    enum CodingKeys: String, CodingKey {
        case emailsFetched     = "emails_fetched"
        case transactionsCreated = "transactions_created"
        case parsingErrors     = "parsing_errors"
    }

    var summaryText: String {
        if transactionsCreated == 0 && (parsingErrors ?? 0) == 0 {
            return "Todo al día"
        }
        if transactionsCreated == 0 {
            return "\(parsingErrors ?? 0) no reconocidos"
        }
        if (parsingErrors ?? 0) == 0 {
            return "+\(transactionsCreated) nuevas"
        }
        return "+\(transactionsCreated) nuevas · \(parsingErrors!) no reconocidos"
    }
}

struct SyncResponse: Codable {
    let stats: SyncStats?
    let message: String?
}

struct DashboardSummary: Codable {
    let totalTransactions: Int
    let totalSpent: Double
    let totalIncome: Double
    let lastSyncAt: String?
    let recentTransactions: [Transaction]

    enum CodingKeys: String, CodingKey {
        case totalTransactions   = "total_transactions"
        case totalSpent          = "total_spent"
        case totalIncome         = "total_income"
        case lastSyncAt          = "last_sync_at"
        case recentTransactions  = "recent_transactions"
    }
}
