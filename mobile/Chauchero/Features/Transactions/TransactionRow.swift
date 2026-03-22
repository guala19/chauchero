import SwiftUI

struct TransactionRow: View {
    let transaction: Transaction

    private var iconName: String {
        switch transaction.transactionType {
        case .transferCredit: return "arrow.down.left"
        case .transferDebit:  return "arrow.up.right"
        case .debit:          return "creditcard.fill"
        }
    }

    private var iconColor: Color {
        switch transaction.transactionType {
        case .transferCredit: return .chGreen
        case .transferDebit:  return .chRed
        case .debit:          return .chBlue
        }
    }

    private var iconBg: Color {
        switch transaction.transactionType {
        case .transferCredit: return .chGreenDim
        case .transferDebit:  return .chRedDim
        case .debit:          return .chBlueDim
        }
    }

    private var amountColor: Color {
        transaction.transactionType.isIncome ? .chGreen : .chRed
    }

    private var amountText: String {
        let prefix = transaction.transactionType.isIncome ? "+" : "−"
        return "\(prefix) \(transaction.amount.clpFormatted)"
    }

    var body: some View {
        HStack(spacing: 12) {
            // Icon
            ZStack {
                Circle()
                    .fill(iconBg)
                    .frame(width: 38, height: 38)
                Image(systemName: iconName)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(iconColor)
            }

            // Description + date
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 4) {
                    Text(transaction.description)
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(.primary)
                        .lineLimit(1)
                    if transaction.parserConfidence < 80 {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.system(size: 10))
                            .foregroundStyle(Color.chAmber)
                    }
                }
                Text(transaction.transactionDate.shortDate)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            // Amount
            Text(amountText)
                .font(.system(.subheadline, design: .monospaced).weight(.semibold))
                .foregroundStyle(amountColor)
        }
        .padding(.vertical, 10)
        .contentShape(Rectangle())
    }
}
