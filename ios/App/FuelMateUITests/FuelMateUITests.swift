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
        app.webViews.buttons.containing(NSPredicate(format: "label CONTAINS %@", "Settings")).firstMatch.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.5)).tap()
        let toggle = app.webViews.descendants(matching: .any).matching(identifier: "iPhone notifications").firstMatch
        for _ in 0..<5 {
            if toggle.exists && toggle.isHittable { break }
            app.webViews.firstMatch.swipeUp()
        }
        XCTAssertTrue(toggle.exists, app.debugDescription)
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        if toggle.value as? String != "1" {
            toggle.tap()
            let allow = springboard.alerts.buttons["Allow"]
            if allow.waitForExistence(timeout: 5) { allow.tap() }
        }
        XCTAssertTrue(toggle.waitForExistence(timeout: 5))
        XCTAssertEqual(toggle.value as? String, "1", "Notification permission must be granted")
        app.terminate()
        app.launch()
        app.webViews.buttons.containing(NSPredicate(format: "label CONTAINS %@", "Settings")).firstMatch.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.5)).tap()
        for _ in 0..<5 {
            if toggle.exists && toggle.isHittable { break }
            app.webViews.firstMatch.swipeUp()
        }
        XCTAssertEqual(toggle.value as? String, "1", "iPhone notification preference must persist")
        let backup = app.webViews.buttons.containing(NSPredicate(format: "label CONTAINS %@", "Backup Data (JSON)")).firstMatch
        for _ in 0..<6 {
            if backup.frame.maxY < app.frame.height - 100 { break }
            app.webViews.firstMatch.swipeUp()
        }
        backup.tap()
        XCTAssertTrue(app.otherElements["ActivityListView"].waitForExistence(timeout: 15))
        let shareScreenshot = XCTAttachment(screenshot: app.screenshot())
        shareScreenshot.name = "FuelMate backup share sheet"
        shareScreenshot.lifetime = .keepAlways
        add(shareScreenshot)
    }
}
