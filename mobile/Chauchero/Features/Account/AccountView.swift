import SwiftUI

struct AccountView: View {
    @EnvironmentObject private var authStore: AuthStore
    @State private var showLogoutConfirm = false

    var body: some View {
        NavigationStack {
            ZStack {
                Color.chBackground.ignoresSafeArea()

                List {
                    // Profile section
                    Section {
                        HStack(spacing: 14) {
                            ZStack {
                                Circle()
                                    .fill(Color.chGreen.opacity(0.15))
                                    .frame(width: 52, height: 52)
                                Text(initials)
                                    .font(.headline.bold())
                                    .foregroundStyle(Color.chGreen)
                            }
                            VStack(alignment: .leading, spacing: 2) {
                                Text(authStore.currentUser?.name ?? "Usuario")
                                    .font(.body.weight(.semibold))
                                    .foregroundStyle(.primary)
                                Text(authStore.currentUser?.email ?? "")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                    .listRowBackground(Color.chCard)

                    // Connected accounts
                    Section("Cuentas conectadas") {
                        HStack {
                            Image(systemName: "building.columns.fill")
                                .foregroundStyle(Color.chBlue)
                                .frame(width: 28)
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Banco de Chile")
                                    .font(.subheadline.weight(.medium))
                                Text("Vía Gmail — Solo lectura")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundStyle(Color.chGreen)
                                .font(.body)
                        }
                    }
                    .listRowBackground(Color.chCard)

                    // App info
                    Section("Aplicación") {
                        InfoRow(icon: "info.circle", label: "Versión", value: "1.0.0")
                        InfoRow(icon: "lock.shield", label: "Seguridad", value: "JWT + Keychain")
                        InfoRow(icon: "envelope.badge.shield.half.filled", label: "Permisos Gmail", value: "Solo lectura")
                    }
                    .listRowBackground(Color.chCard)

                    // Logout
                    Section {
                        Button(role: .destructive) {
                            showLogoutConfirm = true
                        } label: {
                            HStack {
                                Image(systemName: "rectangle.portrait.and.arrow.right")
                                Text("Cerrar sesión")
                            }
                        }
                    }
                    .listRowBackground(Color.chCard)
                }
                .listStyle(.insetGrouped)
                .scrollContentBackground(.hidden)
                .background(Color.chBackground)
            }
            .navigationTitle("Cuenta")
            .navigationBarTitleDisplayMode(.large)
            .confirmationDialog("¿Cerrar sesión?", isPresented: $showLogoutConfirm, titleVisibility: .visible) {
                Button("Cerrar sesión", role: .destructive) {
                    authStore.signOut()
                }
                Button("Cancelar", role: .cancel) {}
            } message: {
                Text("Se eliminará tu sesión de este dispositivo.")
            }
        }
    }

    private var initials: String {
        let name = authStore.currentUser?.name ?? "U"
        return String(name.prefix(2)).uppercased()
    }
}

private struct InfoRow: View {
    let icon: String
    let label: String
    let value: String

    var body: some View {
        HStack {
            Image(systemName: icon)
                .foregroundStyle(Color.chBlue)
                .frame(width: 28)
            Text(label)
                .font(.subheadline)
            Spacer()
            Text(value)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }
}
