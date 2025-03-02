import SwiftUI
import SwiftData
import Network
import Combine

// see: https://medium.com/hyperapp/a-walk-through-hyperapp-2-b1f642fca172

@main

struct app: App {
    
    var sharedModelContainer: ModelContainer = {
        let s = Schema([])
        let mc =
            ModelConfiguration(schema: s, isStoredInMemoryOnly: false)
        do {
            return try ModelContainer(for: s, configurations: [mc])
        } catch {
            fatalError("ModelContainer() failed: \(error)")
        }
    }()
    
    func appeared() { }
    
    var body: some Scene {
        WindowGroup {
            ContentView().frame(minWidth: app.w, minHeight: app.h)
                .onAppear { appeared() }
        }
        .modelContainer(sharedModelContainer)
    }
    
    // xCode Edit Scheme: Release|Debug
    // macOS debug allows to test overlaping navigation in narow window
    
    #if DEBUG || os(iOS)
    static var w: CGFloat = 240.0
    static var h: CGFloat = 320.0
    #else
    static var w: CGFloat = 480.0
    static var h: CGFloat = 320.0
    #endif
    
}
