import SwiftUI

@MainActor
final class HomeViewModel: ObservableObject {
    @Published var summary: DashboardSummary?
    @Published var isLoading = false
    @Published var isSyncing = false
    @Published var syncMessage: SyncMessage?
    @Published var errorMessage: String?

    enum SyncMessage: Equatable {
        case success(String)
        case error(String)
        case cooldown(Int?)
    }

    private let api = APIClient.shared

    func load(token: String) async {
        guard !isLoading else { return }
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            summary = try await api.getDashboard(token: token)
        } catch let e as APIError {
            errorMessage = e.errorDescription
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func sync(token: String) async {
        guard !isSyncing else { return }
        isSyncing = true
        syncMessage = nil
        defer { isSyncing = false }
        do {
            let response = try await api.syncTransactions(token: token)
            let text = response.stats?.summaryText ?? "Actualizado"
            syncMessage = .success(text)
            // Reload summary after sync
            summary = try? await api.getDashboard(token: token)
            try? await Task.sleep(nanoseconds: 4_000_000_000)
            syncMessage = nil
        } catch let e as APIError {
            switch e.httpStatus {
            case 429:
                syncMessage = .cooldown(extractMinutes(e.errorDescription))
            default:
                syncMessage = .error(e.errorDescription ?? "Error al sincronizar")
            }
            try? await Task.sleep(nanoseconds: 5_000_000_000)
            syncMessage = nil
        } catch {
            syncMessage = .error(error.localizedDescription)
        }
    }

    private func extractMinutes(_ msg: String?) -> Int? {
        guard let msg else { return nil }
        let pattern = #"(\d+)\s*minuto"#
        guard let range = msg.range(of: pattern, options: .regularExpression),
              let numRange = msg[range].range(of: #"\d+"#, options: .regularExpression) else {
            return nil
        }
        return Int(msg[numRange])
    }
}

struct HomeView: View {
    @EnvironmentObject private var authStore: AuthStore
    @StateObject private var vm = HomeViewModel()

    var body: some View {
        NavigationStack {
            ZStack {
                Color.chBackground.ignoresSafeArea()

                if vm.isLoading && vm.summary == nil {
                    ProgressView()
                        .tint(Color.chGreen)
                } else {
                    ScrollView {
                        VStack(spacing: 20) {
                            // Greeting
                            GreetingHeader(
                                name: authStore.currentUser?.name ?? "Usuario",
                                lastSyncAt: vm.summary?.lastSyncAt
                            )

                            // Summary cards
                            if let summary = vm.summary {
                                SummaryCardsRow(summary: summary)
                            }

                            // Sync banner
                            if let msg = vm.syncMessage {
                                SyncBanner(message: msg)
                                    .transition(.move(edge: .top).combined(with: .opacity))
                            }

                            // Recent transactions
                            if let summary = vm.summary, !summary.recentTransactions.isEmpty {
                                RecentTransactionsSection(transactions: summary.recentTransactions)
                            } else if vm.summary != nil {
                                EmptyStateCard()
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.top, 8)
                        .padding(.bottom, 32)
                    }
                    .refreshable {
                        guard let token = authStore.token else { return }
                        await vm.load(token: token)
                    }
                }

                if let error = vm.errorMessage {
                    VStack {
                        Spacer()
                        ErrorToast(message: error)
                            .padding(.horizontal, 16)
                            .padding(.bottom, 24)
                    }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    SyncToolbarButton(isSyncing: vm.isSyncing) {
                        guard let token = authStore.token else { return }
                        Task { await vm.sync(token: token) }
                    }
                }
            }
            .animation(.easeInOut(duration: 0.3), value: vm.syncMessage)
        }
        .task {
            guard let token = authStore.token else { return }
            await vm.load(token: token)
        }
    }
}

// MARK: - Sub-views

private struct GreetingHeader: View {
    let name: String
    let lastSyncAt: String?

    private var greeting: String {
        let h = Calendar.current.component(.hour, from: Date())
        let first = name.components(separatedBy: " ").first ?? name
        if h < 12 { return "Buenos días, \(first)" }
        if h < 18 { return "Buenas tardes, \(first)" }
        return "Buenas noches, \(first)"
    }

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(greeting)
                    .font(.title3.bold())
                    .foregroundStyle(.primary)
                if let sync = lastSyncAt {
                    Text("Último sync: \(sync.relativeDate)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            Spacer()
        }
    }
}

private struct SummaryCardsRow: View {
    let summary: DashboardSummary

    var body: some View {
        HStack(spacing: 12) {
            SummaryCard(
                title: "Gastos",
                value: summary.totalSpent.clpFormatted,
                icon: "arrow.up.right",
                color: .chRed
            )
            SummaryCard(
                title: "Ingresos",
                value: summary.totalIncome.clpFormatted,
                icon: "arrow.down.left",
                color: .chGreen
            )
        }
    }
}

private struct SummaryCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(color)
                Text(title)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
            }
            Text(value)
                .font(.system(.body, design: .monospaced).weight(.bold))
                .foregroundStyle(.primary)
                .minimumScaleFactor(0.7)
                .lineLimit(1)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.chCard)
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .strokeBorder(Color.chBorder, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

private struct SyncBanner: View {
    let message: HomeViewModel.SyncMessage

    private var icon: String {
        switch message {
        case .success: return "checkmark.circle.fill"
        case .error:   return "wifi.slash"
        case .cooldown: return "clock.fill"
        }
    }

    private var color: Color {
        switch message {
        case .success:  return .chGreen
        case .error:    return .chRed
        case .cooldown: return .chAmber
        }
    }

    private var text: String {
        switch message {
        case .success(let t):       return t
        case .error(let t):         return t
        case .cooldown(let mins):
            if let m = mins { return "Espera \(m) min antes de sincronizar" }
            return "Espera un momento antes de sincronizar"
        }
    }

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .foregroundStyle(color)
                .font(.subheadline)
            Text(text)
                .font(.subheadline)
                .foregroundStyle(color)
            Spacer()
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(color.opacity(0.12))
        .overlay(
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .strokeBorder(color.opacity(0.25), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }
}

private struct RecentTransactionsSection: View {
    let transactions: [Transaction]

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Recientes")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.primary)
                Spacer()
                NavigationLink(destination: TransactionsView()) {
                    Text("Ver todas")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(Color.chGreen)
                }
            }

            VStack(spacing: 0) {
                ForEach(Array(transactions.prefix(5).enumerated()), id: \.element.id) { idx, tx in
                    TransactionRow(transaction: tx)
                    if idx < min(4, transactions.count - 1) {
                        Divider()
                            .background(Color.chBorder)
                            .padding(.leading, 56)
                    }
                }
            }
            .background(Color.chCard)
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .strokeBorder(Color.chBorder, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
    }
}

private struct EmptyStateCard: View {
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "tray")
                .font(.largeTitle)
                .foregroundStyle(.secondary)
            Text("Sin transacciones")
                .font(.subheadline.weight(.medium))
            Text("Pulsa Sincronizar para analizar\ntus correos de Banco de Chile.")
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(32)
        .frame(maxWidth: .infinity)
        .background(Color.chCard)
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .strokeBorder(Color.chBorder, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

private struct ErrorToast: View {
    let message: String

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(Color.chRed)
                .font(.subheadline)
            Text(message)
                .font(.subheadline)
                .foregroundStyle(Color.chRed)
            Spacer()
        }
        .padding(12)
        .background(Color.chRedDim)
        .overlay(
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .strokeBorder(Color.chRed.opacity(0.3), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }
}

private struct SyncToolbarButton: View {
    let isSyncing: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            if isSyncing {
                ProgressView()
                    .tint(Color.chGreen)
                    .scaleEffect(0.85)
            } else {
                Image(systemName: "arrow.clockwise")
                    .font(.body.weight(.medium))
                    .foregroundStyle(Color.chGreen)
            }
        }
        .disabled(isSyncing)
    }
}
