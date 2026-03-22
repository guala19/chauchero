import SwiftUI

extension Color {
    // ── Brand palette ────────────────────────────────────────────────────────
    static let chBackground = Color("CHBackground")
    static let chCard       = Color("CHCard")
    static let chBorder     = Color("CHBorder")
    static let chGreen      = Color("CHGreen")
    static let chRed        = Color("CHRed")
    static let chBlue       = Color("CHBlue")
    static let chAmber      = Color("CHAmber")

    // ── Dim variants (10% opacity) ───────────────────────────────────────────
    static let chGreenDim   = Color("CHGreen").opacity(0.12)
    static let chRedDim     = Color("CHRed").opacity(0.12)
    static let chBlueDim    = Color("CHBlue").opacity(0.12)
    static let chAmberDim   = Color("CHAmber").opacity(0.12)
}

extension Double {
    /// Formats a CLP amount as "$ 1.234.567"
    var clpFormatted: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.groupingSeparator = "."
        formatter.decimalSeparator = ","
        formatter.maximumFractionDigits = 0
        let formatted = formatter.string(from: NSNumber(value: self)) ?? "\(Int(self))"
        return "$ \(formatted)"
    }

    /// Compact format: "$ 1,2M" or "$ 345K"
    var clpCompact: String {
        if self >= 1_000_000 {
            return String(format: "$ %.1fM", self / 1_000_000)
        } else if self >= 1_000 {
            return String(format: "$ %.0fK", self / 1_000)
        }
        return self.clpFormatted
    }
}

extension String {
    /// Parses an ISO-8601 date string and returns a localized short date
    var shortDate: String {
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withFullDate]
        guard let date = iso.date(from: self) ?? {
            let df = DateFormatter()
            df.dateFormat = "yyyy-MM-dd"
            return df.date(from: self)
        }() else { return self }
        let df = DateFormatter()
        df.locale = Locale(identifier: "es_CL")
        df.dateStyle = .medium
        df.timeStyle = .none
        return df.string(from: date)
    }

    /// Relative date: "hace 2 horas", "ayer", etc.
    var relativeDate: String {
        let iso = ISO8601DateFormatter()
        guard let date = iso.date(from: self) else { return self }
        let formatter = RelativeDateTimeFormatter()
        formatter.locale = Locale(identifier: "es_CL")
        formatter.unitsStyle = .full
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}
