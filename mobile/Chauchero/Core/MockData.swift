import Foundation

enum MockData {
    static let user = User(
        email: "demo@chauchero.app",
        name: "Diego Demo",
        lastSyncAt: ISO8601DateFormatter().string(from: Date().addingTimeInterval(-3600))
    )

    static let transactions: [Transaction] = [
        tx("1",  "Supermercado Jumbo",        42_990, "debit",           "2026-03-17", 97),
        tx("2",  "Transferencia Juan Pérez",  150_000, "transfer_credit", "2026-03-16", 99),
        tx("3",  "Netflix",                   8_990,  "debit",           "2026-03-15", 95),
        tx("4",  "Uber",                      6_500,  "debit",           "2026-03-15", 91),
        tx("5",  "Pago sueldo",               1_250_000, "transfer_credit","2026-03-14", 99),
        tx("6",  "Farmacia Cruz Verde",       18_400, "debit",           "2026-03-13", 88),
        tx("7",  "Transferencia a María",     80_000, "transfer_debit",  "2026-03-12", 96),
        tx("8",  "Cafetería Starbucks",       4_500,  "debit",           "2026-03-12", 60),
        tx("9",  "Ripley",                    59_990, "debit",           "2026-03-11", 93),
        tx("10", "Gasolinera COPEC",          35_000, "debit",           "2026-03-10", 99),
        tx("11", "Transferencia empresa",     200_000,"transfer_credit", "2026-03-09", 99),
        tx("12", "Restaurant Liguria",        22_000, "debit",           "2026-03-08", 85),
    ]

    static let summary = DashboardSummary(
        totalTransactions: 12,
        totalSpent: 298_370,
        totalIncome: 1_600_000,
        lastSyncAt: ISO8601DateFormatter().string(from: Date().addingTimeInterval(-3600)),
        recentTransactions: Array(transactions.prefix(5))
    )

    private static func tx(
        _ id: String,
        _ desc: String,
        _ amount: Double,
        _ type: String,
        _ date: String,
        _ confidence: Int
    ) -> Transaction {
        Transaction(
            id: id,
            description: desc,
            amount: amount,
            transactionType: Transaction.TransactionType(rawValue: type) ?? .debit,
            transactionDate: date,
            parserConfidence: confidence,
            emailSubject: "Notificación Banco de Chile — \(desc)",
            notes: nil
        )
    }
}
