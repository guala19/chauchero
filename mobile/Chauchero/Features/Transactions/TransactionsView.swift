import SwiftUI

@MainActor
final class TransactionsViewModel: ObservableObject {
    @Published var transactions: [Transaction] = []
    @Published var isLoading = false
    @Published var isLoadingMore = false
    @Published var errorMessage: String?
    @Published var hasMore = true
    @Published var searchText = ""
    @Published var selectedFilter: FilterTab = .all

    enum FilterTab: String, CaseIterable {
        case all       = "Todas"
        case debit     = "Gastos"
        case transfer  = "Transferencias"
        case income    = "Ingresos"
    }

    private let pageSize = 50
    private let api = APIClient.shared

    var filtered: [Transaction] {
        var list = transactions
        switch selectedFilter {
        case .all:      break
        case .debit:    list = list.filter { $0.transactionType == .debit }
        case .transfer: list = list.filter { $0.transactionType == .transferDebit || $0.transactionType == .transferCredit }
        case .income:   list = list.filter { $0.transactionType == .transferCredit }
        }
        if !searchText.isEmpty {
            list = list.filter { $0.description.localizedCaseInsensitiveContains(searchText) }
        }
        return list
    }

    func load(token: String) async {
        guard !isLoading else { return }
        isLoading = true
        transactions = []
        hasMore = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            let response = try await api.getTransactions(token: token, skip: 0, limit: pageSize)
            transactions = response.transactions
            hasMore = response.transactions.count >= pageSize
        } catch let e as APIError {
            errorMessage = e.errorDescription
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func loadMore(token: String) async {
        guard hasMore, !isLoadingMore, !isLoading else { return }
        isLoadingMore = true
        defer { isLoadingMore = false }
        do {
            let response = try await api.getTransactions(token: token, skip: transactions.count, limit: pageSize)
            transactions.append(contentsOf: response.transactions)
            hasMore = response.transactions.count >= pageSize
        } catch {
            // Silent fail on pagination
        }
    }

    func updateNote(token: String, id: String, note: String) async {
        guard let idx = transactions.firstIndex(where: { $0.id == id }) else { return }
        do {
            let updated = try await api.updateNote(token: token, transactionId: id, note: note)
            transactions[idx] = updated
        } catch {
            // Will show error in sheet
        }
    }
}

struct TransactionsView: View {
    @EnvironmentObject private var authStore: AuthStore
    @StateObject private var vm = TransactionsViewModel()
    @State private var selectedTransaction: Transaction?

    var body: some View {
        ZStack {
            Color.chBackground.ignoresSafeArea()

            if vm.isLoading {
                ProgressView()
                    .tint(Color.chGreen)
            } else {
                VStack(spacing: 0) {
                    // Filter tabs
                    FilterTabBar(selected: $vm.selectedFilter)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .background(Color.chBackground)

                    Divider().background(Color.chBorder)

                    if vm.filtered.isEmpty {
                        Spacer()
                        Text(vm.searchText.isEmpty ? "Sin transacciones en esta categoría" : "Sin resultados")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                        Spacer()
                    } else {
                        List {
                            ForEach(vm.filtered) { tx in
                                TransactionRow(transaction: tx)
                                    .listRowBackground(Color.chCard)
                                    .listRowSeparatorTint(Color.chBorder)
                                    .listRowInsets(EdgeInsets(top: 0, leading: 16, bottom: 0, trailing: 16))
                                    .onTapGesture { selectedTransaction = tx }
                                    .onAppear {
                                        if tx.id == vm.filtered.last?.id, let token = authStore.token {
                                            Task { await vm.loadMore(token: token) }
                                        }
                                    }
                            }
                            if vm.isLoadingMore {
                                HStack {
                                    Spacer()
                                    ProgressView()
                                        .tint(Color.chGreen)
                                        .padding()
                                    Spacer()
                                }
                                .listRowBackground(Color.chBackground)
                                .listRowSeparator(.hidden)
                            }
                        }
                        .listStyle(.plain)
                        .background(Color.chBackground)
                        .scrollContentBackground(.hidden)
                    }
                }
                .searchable(text: $vm.searchText, prompt: "Buscar transacción…")
            }
        }
        .navigationTitle("Transacciones")
        .navigationBarTitleDisplayMode(.large)
        .sheet(item: $selectedTransaction) { tx in
            TransactionDetailSheet(transaction: tx) { note in
                guard let token = authStore.token else { return }
                Task { await vm.updateNote(token: token, id: tx.id, note: note) }
            }
        }
        .task {
            guard let token = authStore.token else { return }
            await vm.load(token: token)
        }
        .refreshable {
            guard let token = authStore.token else { return }
            await vm.load(token: token)
        }
    }
}

// MARK: - Filter tab bar

private struct FilterTabBar: View {
    @Binding var selected: TransactionsViewModel.FilterTab

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(TransactionsViewModel.FilterTab.allCases, id: \.self) { tab in
                    Button(action: { selected = tab }) {
                        Text(tab.rawValue)
                            .font(.caption.weight(.semibold))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(selected == tab ? Color.chGreen : Color.chCard)
                            .foregroundStyle(selected == tab ? Color.black : Color.secondary)
                            .clipShape(Capsule())
                            .overlay(
                                Capsule()
                                    .strokeBorder(selected == tab ? Color.clear : Color.chBorder, lineWidth: 1)
                            )
                    }
                    .animation(.easeInOut(duration: 0.15), value: selected)
                }
            }
        }
    }
}
