import SwiftUI

struct TransactionDetailSheet: View {
    let transaction: Transaction
    let onSaveNote: (String) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var note: String
    @State private var isSaving = false

    init(transaction: Transaction, onSaveNote: @escaping (String) -> Void) {
        self.transaction = transaction
        self.onSaveNote = onSaveNote
        _note = State(initialValue: transaction.notes ?? "")
    }

    private var isIncome: Bool { transaction.transactionType.isIncome }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.chBackground.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 20) {
                        // Amount hero
                        VStack(spacing: 6) {
                            Text(isIncome ? "+\(transaction.amount.clpFormatted)" : "−\(transaction.amount.clpFormatted)")
                                .font(.system(size: 36, weight: .bold, design: .monospaced))
                                .foregroundStyle(isIncome ? Color.chGreen : Color.chRed)

                            Text(transaction.transactionType.displayName)
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 4)
                                .background(isIncome ? Color.chGreenDim : Color.chRedDim)
                                .clipShape(Capsule())
                        }
                        .padding(.top, 8)

                        // Details card
                        VStack(spacing: 0) {
                            DetailRow(label: "Descripción", value: transaction.description)
                            Divider().background(Color.chBorder).padding(.leading, 16)
                            DetailRow(label: "Fecha", value: transaction.transactionDate.shortDate)
                            Divider().background(Color.chBorder).padding(.leading, 16)
                            DetailRow(label: "Banco", value: "Banco de Chile")
                            if transaction.parserConfidence < 100 {
                                Divider().background(Color.chBorder).padding(.leading, 16)
                                DetailRow(
                                    label: "Confianza",
                                    value: "\(transaction.parserConfidence)%",
                                    valueColor: transaction.parserConfidence < 80 ? .chAmber : .secondary
                                )
                            }
                            if let subject = transaction.emailSubject {
                                Divider().background(Color.chBorder).padding(.leading, 16)
                                DetailRow(label: "Correo", value: subject)
                            }
                        }
                        .background(Color.chCard)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .strokeBorder(Color.chBorder, lineWidth: 1)
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        .padding(.horizontal, 16)

                        // Low confidence warning
                        if transaction.parserConfidence < 80 {
                            HStack(spacing: 8) {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .foregroundStyle(Color.chAmber)
                                Text("Confianza baja (\(transaction.parserConfidence)%) — revisa esta transacción")
                                    .font(.caption)
                                    .foregroundStyle(Color.chAmber)
                            }
                            .padding(12)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.chAmberDim)
                            .overlay(
                                RoundedRectangle(cornerRadius: 10, style: .continuous)
                                    .strokeBorder(Color.chAmber.opacity(0.3), lineWidth: 1)
                            )
                            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                            .padding(.horizontal, 16)
                        }

                        // Notes
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Nota")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(.secondary)
                                .padding(.horizontal, 16)

                            TextEditor(text: $note)
                                .font(.subheadline)
                                .foregroundStyle(.primary)
                                .frame(minHeight: 80)
                                .padding(12)
                                .background(Color.chCard)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                                        .strokeBorder(Color.chBorder, lineWidth: 1)
                                )
                                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                                .padding(.horizontal, 16)
                                .scrollContentBackground(.hidden)
                        }

                        // Save button
                        Button {
                            isSaving = true
                            onSaveNote(note)
                            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                                isSaving = false
                                dismiss()
                            }
                        } label: {
                            HStack(spacing: 6) {
                                if isSaving {
                                    ProgressView().tint(.black).scaleEffect(0.8)
                                } else {
                                    Image(systemName: "checkmark")
                                }
                                Text("Guardar nota")
                            }
                            .font(.subheadline.weight(.semibold))
                            .frame(maxWidth: .infinity)
                            .frame(height: 44)
                            .background(Color.chGreen)
                            .foregroundStyle(.black)
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        }
                        .padding(.horizontal, 16)
                        .disabled(isSaving)
                    }
                    .padding(.bottom, 32)
                }
            }
            .navigationTitle("Detalle")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Cerrar") { dismiss() }
                        .foregroundStyle(Color.chGreen)
                }
            }
        }
    }
}

private struct DetailRow: View {
    let label: String
    let value: String
    var valueColor: Color = .primary

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Text(label)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .frame(width: 100, alignment: .leading)
            Text(value)
                .font(.subheadline)
                .foregroundStyle(valueColor)
                .multilineTextAlignment(.trailing)
                .frame(maxWidth: .infinity, alignment: .trailing)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }
}
