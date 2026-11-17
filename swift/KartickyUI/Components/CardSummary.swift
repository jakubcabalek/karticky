import Foundation
import KartickyCore

/// Co komponenty potřebují vědět o kartě. Fáze 2 ho naplní z `CardEntry` v KartickyCore;
/// do té doby ho plní mock data v náhledech a snapshotech.
public struct CardSummary: Identifiable, Hashable, Sendable {
    public var id: String
    public var name: String
    public var imageURL: URL?
    public var manaCost: String
    public var colors: [ManaColor]
    public var typeLine: String
    public var setCode: String
    public var collectorNumber: String
    public var quantity: Int
    public var foil: Bool
    public var price: Double?
    public var previousPrice: Double?
    public var currency: PriceCurrency

    public init(
        id: String, name: String, imageURL: URL? = nil, manaCost: String = "", colors: [ManaColor] = [],
        typeLine: String = "", setCode: String = "", collectorNumber: String = "", quantity: Int = 1,
        foil: Bool = false, price: Double? = nil, previousPrice: Double? = nil, currency: PriceCurrency = .eur
    ) {
        self.id = id
        self.name = name
        self.imageURL = imageURL
        self.manaCost = manaCost
        self.colors = colors
        self.typeLine = typeLine
        self.setCode = setCode
        self.collectorNumber = collectorNumber
        self.quantity = quantity
        self.foil = foil
        self.price = price
        self.previousPrice = previousPrice
        self.currency = currency
    }
}

public extension CardSummary {
    /// Řádek knihovny → co ukazují komponenty. Cena v EUR podle provedení (foil / obyčejná).
    init(entry: CardEntry) {
        let card = entry.card
        self.init(
            id: entry.key, name: card.printedName ?? card.name, imageURL: card.imageNormal ?? card.imageSmall,
            manaCost: card.manaCost, colors: ManaColor.from(card.colors.isEmpty ? card.colorIdentity : card.colors),
            typeLine: card.typeLine, setCode: card.set.uppercased(), collectorNumber: card.collectorNumber,
            quantity: entry.quantity, foil: entry.finish == .foil, price: entryPrice(entry, .eur)
        )
    }
}
