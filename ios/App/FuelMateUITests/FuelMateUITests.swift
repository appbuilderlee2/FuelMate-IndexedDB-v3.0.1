import XCTest

final class FuelMateUITests: XCTestCase {
    func testLaunchAndVehiclePersistsAfterRelaunch() {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launch()
        let web = app.webViews.firstMatch
        XCTAssertTrue(web.waitForExistence(timeout: 30))
        let make = web.textFields["Honda"]
        if make.waitForExistence(timeout: 5) {
            make.tap()
            make.typeText("NativeTest")
            let model = web.textFields["Civic"]
            model.tap()
            model.typeText("Offline")
            web.buttons["Save"].tap()
        }
        XCTAssertTrue(web.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "NativeTest Offline")).firstMatch.waitForExistence(timeout: 15))
        XCTAssertTrue(web.buttons.containing(NSPredicate(format: "label CONTAINS %@", "Settings")).firstMatch.exists)
        let screenshot = XCTAttachment(screenshot: app.screenshot())
        screenshot.name = "FuelMate native home"
        screenshot.lifetime = .keepAlways
        add(screenshot)
        app.terminate()
        app.launch()
        XCTAssertTrue(app.webViews.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "NativeTest Offline")).firstMatch.waitForExistence(timeout: 30))
        app.webViews.buttons.containing(NSPredicate(format: "label CONTAINS %@", "Settings")).firstMatch.tap()
        app.webViews.buttons.containing(NSPredicate(format: "label CONTAINS %@", "Backup Data (JSON)")).firstMatch.tap()
        XCTAssertTrue(app.buttons["Copy"].waitForExistence(timeout: 15))
        let shareScreenshot = XCTAttachment(screenshot: app.screenshot())
        shareScreenshot.name = "FuelMate backup share sheet"
        shareScreenshot.lifetime = .keepAlways
        add(shareScreenshot)
    }
}
