import SwiftUI
import AuthenticationServices

struct LoginView: View {
    @EnvironmentObject private var authStore: AuthStore
    @State private var isLoading = false
    @State private var errorMessage: String?

    // Update to your deployed backend URL
    #if DEBUG
    private let authURL = "http://localhost:8000/auth/google?mobile=true"
    #else
    private let authURL = "https://chauchero-production.up.railway.app/auth/google?mobile=true"
    #endif

    var body: some View {
        ZStack {
            Color.chBackground.ignoresSafeArea()

            // Subtle grid background
            Canvas { ctx, size in
                let spacing: CGFloat = 32
                var path = Path()
                var x: CGFloat = 0
                while x <= size.width {
                    path.move(to: CGPoint(x: x, y: 0))
                    path.addLine(to: CGPoint(x: x, y: size.height))
                    x += spacing
                }
                var y: CGFloat = 0
                while y <= size.height {
                    path.move(to: CGPoint(x: 0, y: y))
                    path.addLine(to: CGPoint(x: size.width, y: y))
                    y += spacing
                }
                ctx.stroke(path, with: .color(.white.opacity(0.03)), lineWidth: 1)
            }
            .ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()

                // Logo + brand
                VStack(spacing: 16) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 20, style: .continuous)
                            .fill(Color.chGreen.opacity(0.15))
                            .frame(width: 72, height: 72)
                        RoundedRectangle(cornerRadius: 20, style: .continuous)
                            .strokeBorder(Color.chGreen.opacity(0.3), lineWidth: 1)
                            .frame(width: 72, height: 72)
                        Text("₡")
                            .font(.system(size: 36, weight: .bold, design: .rounded))
                            .foregroundStyle(Color.chGreen)
                    }

                    VStack(spacing: 4) {
                        Text("Chauchero")
                            .font(.system(size: 28, weight: .bold, design: .rounded))
                            .foregroundStyle(.white)
                        Text("Tus gastos, sin esfuerzo")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                // Value props
                VStack(spacing: 12) {
                    FeatureRow(icon: "envelope.fill",      color: .chBlue,  text: "Lee tus correos de Banco de Chile")
                    FeatureRow(icon: "chart.bar.fill",     color: .chGreen, text: "Visualiza tus gastos al instante")
                    FeatureRow(icon: "lock.shield.fill",   color: .chAmber, text: "Solo lectura — nunca modifica nada")
                }
                .padding(.horizontal, 32)

                Spacer()

                // CTA
                VStack(spacing: 12) {
                    if let error = errorMessage {
                        HStack(spacing: 6) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundStyle(Color.chRed)
                                .font(.caption)
                            Text(error)
                                .font(.caption)
                                .foregroundStyle(Color.chRed)
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(Color.chRedDim)
                        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                    }

                    Button(action: startGoogleAuth) {
                        HStack(spacing: 10) {
                            if isLoading {
                                ProgressView()
                                    .tint(.black)
                                    .scaleEffect(0.85)
                            } else {
                                Image(systemName: "person.crop.circle.badge.checkmark")
                                    .font(.body.weight(.semibold))
                            }
                            Text(isLoading ? "Conectando…" : "Continuar con Google")
                                .font(.body.weight(.semibold))
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 50)
                        .background(Color.chGreen)
                        .foregroundStyle(.black)
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    }
                    .disabled(isLoading)
                    .animation(.easeInOut(duration: 0.2), value: isLoading)

                    Button(action: { authStore.signInDemo() }) {
                        Text("Explorar sin cuenta")
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(.secondary)
                    }

                    Text("Al continuar aceptas los Términos de servicio")
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                        .multilineTextAlignment(.center)
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 40)
            }
        }
    }

    private func startGoogleAuth() {
        guard let url = URL(string: authURL) else { return }
        isLoading = true
        errorMessage = nil

        let session = ASWebAuthenticationSession(
            url: url,
            callbackURLScheme: "chauchero"
        ) { callbackURL, error in
            Task { @MainActor in
                defer { isLoading = false }

                if let error {
                    if (error as? ASWebAuthenticationSessionError)?.code == .canceledLogin {
                        return
                    }
                    errorMessage = "Error de autenticación. Intenta de nuevo."
                    return
                }

                guard
                    let callbackURL,
                    let components = URLComponents(url: callbackURL, resolvingAgainstBaseURL: false),
                    let code = components.queryItems?.first(where: { $0.name == "code" })?.value
                else {
                    errorMessage = "No se recibió el código de autorización."
                    return
                }

                do {
                    let auth = try await APIClient.shared.exchangeCode(code)
                    authStore.signIn(token: auth.accessToken, user: auth.user)
                } catch {
                    errorMessage = (error as? APIError)?.errorDescription ?? error.localizedDescription
                }
            }
        }
        session.prefersEphemeralWebBrowserSession = false
        session.start()
    }
}

private struct FeatureRow: View {
    let icon: String
    let color: Color
    let text: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.body)
                .foregroundStyle(color)
                .frame(width: 32)
            Text(text)
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Spacer()
        }
    }
}
