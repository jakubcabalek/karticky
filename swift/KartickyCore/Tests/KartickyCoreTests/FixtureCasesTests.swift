import Foundation
import Testing
@testable import KartickyCore

/// Případy z TypeScriptu (scripts/swift-fixtures.cjs): stejná funkce se stejnými argumenty
/// musí ve Swiftu dát stejný výsledek. Port každé funkce přidá řádek do `ports`.
struct FixtureCase: Decodable, Sendable {
    let module: String
    let function: String
    let args: [JSONValue]
    let result: JSONValue
}

struct FixtureFile: Decodable, Sendable {
    let now: String
    let cases: [FixtureCase]
}

enum Fixtures {
    static func load() throws -> FixtureFile {
        let url = try #require(Bundle.module.url(forResource: "cases", withExtension: "json", subdirectory: "Fixtures"))
        return try JSONDecoder().decode(FixtureFile.self, from: Data(contentsOf: url))
    }

    /// "modul.funkce" → volání portu s argumenty z fixture, výsledek jako JSON.
    /// Doplňuje se postupně s převodem logiky (docs/swiftui-plan.md, bod 5).
    static let ports: [String: @Sendable ([JSONValue]) throws -> JSONValue] = [:]
}

@Test func fixturesLoad() throws {
    let file = try Fixtures.load()
    #expect(!file.cases.isEmpty)
}

@Test func portedFunctionsMatchTypeScript() throws {
    let file = try Fixtures.load()
    var executed = 0
    for fixture in file.cases {
        guard let port = Fixtures.ports["\(fixture.module).\(fixture.function)"] else { continue }
        let result = try port(fixture.args)
        #expect(result == fixture.result, "\(fixture.module).\(fixture.function)(\(fixture.args))")
        executed += 1
    }
    print("cases.json: \(executed) executed of \(file.cases.count)")
}
