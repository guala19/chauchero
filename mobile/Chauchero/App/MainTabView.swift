import SwiftUI

struct MainTabView: View {
    @EnvironmentObject private var authStore: AuthStore
    @State private var selectedTab: Tab = .home

    enum Tab {
        case home, transactions, account
    }

    var body: some View {
        ZStack(alignment: .top) {
        TabView(selection: $selectedTab) {
            HomeView()
                .tabItem {
                    Label("Inicio", systemImage: "house.fill")
                }
                .tag(Tab.home)

            TransactionsView()
                .tabItem {
                    Label("Transacciones", systemImage: "list.bullet.rectangle.portrait.fill")
                }
                .tag(Tab.transactions)

            AccountView()
                .tabItem {
                    Label("Cuenta", systemImage: "person.circle.fill")
                }
                .tag(Tab.account)
        }
        .tint(Color.chGreen)

        if authStore.isDemoMode {
            DemoBanner()
        }
        } // ZStack
    }
}

private struct DemoBanner: View {
    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: "eye.fill")
                .font(.caption2)
            Text("Modo demo — datos ficticios")
                .font(.caption2.weight(.semibold))
        }
        .foregroundStyle(.black)
        .padding(.horizontal, 12)
        .padding(.vertical, 5)
        .background(Color.chAmber)
        .clipShape(Capsule())
        .padding(.top, 8)
        .shadow(color: .black.opacity(0.3), radius: 4, y: 2)
    }
}
