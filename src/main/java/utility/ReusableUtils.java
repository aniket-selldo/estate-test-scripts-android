package utility;

import io.appium.java_client.android.AndroidDriver;
import io.appium.java_client.AppiumBy;
import org.openqa.selenium.support.ui.WebDriverWait;
import java.time.Duration;
import java.io.File;
import java.io.IOException;
import org.apache.commons.io.FileUtils;
import org.openqa.selenium.By;
import org.openqa.selenium.Dimension;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.OutputType;
import org.openqa.selenium.Point;
import org.openqa.selenium.TakesScreenshot;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.interactions.PointerInput;
import org.openqa.selenium.interactions.Sequence;
import java.util.Arrays;

public class ReusableUtils {

    private AndroidDriver driver;
    private WebDriverWait wait;
    protected ReusableUtils(AndroidDriver driver){
        this.driver = driver;
        this.wait = new  WebDriverWait(driver,Duration.ofSeconds(20));
    }

    // ===================== Wait Utilities (Extended) =====================
    protected WebElement waitUntilElementVisible(WebElement element){
        wait.until(ExpectedConditions.visibilityOf(element));
        return element;
    }

    protected WebElement waitUntilElementInvisible(WebElement element){
        wait.until(ExpectedConditions.invisibilityOf(element));
        return element;
    }

    protected WebElement waitUntilElementClickable(WebElement element){
        wait.until(ExpectedConditions.elementToBeClickable(element));
        return element;
    }
    
    protected WebElement waitUntilPresenceLocated(By locator){
        return (WebElement) wait.until(ExpectedConditions.presenceOfElementLocated(locator));
    }

    protected boolean waitUntilTextPresentInElement(WebElement element, String text){
        return wait.until(ExpectedConditions.textToBePresentInElement(element, text));
    }

    protected boolean waitUntilAttributeEquals(WebElement element, String attribute, String value){
        return wait.until(ExpectedConditions.attributeToBe(element, attribute, value));
    }

    protected boolean waitUntilElementInvisible(By locator){
        return wait.until(ExpectedConditions.invisibilityOfElementLocated(locator));
    }

    protected WebElement fluentWaitVisible(By locator, Duration timeout, Duration pollingEvery){
        WebDriverWait customWait = new WebDriverWait(driver, timeout);
        customWait.pollingEvery(pollingEvery);
        return customWait.until(ExpectedConditions.visibilityOfElementLocated(locator));
    }

    // ===================== Safe Element Interactions =====================
    protected void safeClick(WebElement element){
        waitUntilElementClickable(element).click();
    }

    protected void clearAndType(WebElement element, String text){
        waitUntilElementVisible(element);
        element.clear();
        element.sendKeys(text);
    }

    protected boolean isDisplayed(WebElement element){
        try {
            return element.isDisplayed();
        } catch (Exception e){
            return false;
        }
    }

    // ===================== Screenshots =====================
    protected String takeScreenshot(String fileName){
        TakesScreenshot ts = (TakesScreenshot) driver;
        File src = ts.getScreenshotAs(OutputType.FILE);
        File dest = new File(System.getProperty("user.dir") + File.separator + "reports" + File.separator + fileName + ".png");
        try {
            FileUtils.copyFile(src, dest);
        } catch (IOException e) {
            // Intentionally suppressed per project rules (no prints). Rethrow unchecked.
            throw new RuntimeException(e);
        }
        return dest.getAbsolutePath();
    }

    protected String takeElementScreenshot(WebElement element, String fileName){
        File src = element.getScreenshotAs(OutputType.FILE);
        File dest = new File(System.getProperty("user.dir") + File.separator + "reports" + File.separator + fileName + ".png");
        try {
            FileUtils.copyFile(src, dest);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
        return dest.getAbsolutePath();
    }

    // ===================== Scrolling / Swiping =====================
    protected void swipe(int startX, int startY, int endX, int endY, int durationMs){
        PointerInput finger = new PointerInput(PointerInput.Kind.TOUCH, "finger");
        Sequence swipe = new Sequence(finger, 1);
        swipe.addAction(finger.createPointerMove(Duration.ZERO, PointerInput.Origin.viewport(), startX, startY));
        swipe.addAction(finger.createPointerDown(PointerInput.MouseButton.LEFT.asArg()));
        swipe.addAction(finger.createPointerMove(Duration.ofMillis(Math.max(durationMs, 1)), PointerInput.Origin.viewport(), endX, endY));
        swipe.addAction(finger.createPointerUp(PointerInput.MouseButton.LEFT.asArg()));
        driver.perform(Arrays.asList(swipe));
    }

    protected void swipeUp(double distanceRatio){
        Dimension size = driver.manage().window().getSize();
        int width = size.width;
        int height = size.height;
        int startX = width / 2;
        int startY = (int) (height * 0.8);
        int endY = (int) (startY - height * Math.min(Math.max(distanceRatio, 0.1), 0.8));
        swipe(startX, startY, startX, endY, 600);
    }

    protected void swipeDown(double distanceRatio){
        Dimension size = driver.manage().window().getSize();
        int width = size.width;
        int height = size.height;
        int startX = width / 2;
        int startY = (int) (height * 0.2);
        int endY = (int) (startY + height * Math.min(Math.max(distanceRatio, 0.1), 0.8));
        swipe(startX, startY, startX, endY, 600);
    }

    protected void swipeLeft(double distanceRatio){
        Dimension size = driver.manage().window().getSize();
        int width = size.width;
        int height = size.height;
        int startX = (int) (width * 0.8);
        int endX = (int) (startX - width * Math.min(Math.max(distanceRatio, 0.1), 0.8));
        int y = height / 2;
        swipe(startX, y, endX, y, 600);
    }

    protected void swipeRight(double distanceRatio){
        Dimension size = driver.manage().window().getSize();
        int width = size.width;
        int height = size.height;
        int startX = (int) (width * 0.2);
        int endX = (int) (startX + width * Math.min(Math.max(distanceRatio, 0.1), 0.8));
        int y = height / 2;
        swipe(startX, y, endX, y, 600);
    }

    protected WebElement scrollToText(String text){
        return driver.findElement(AppiumBy.androidUIAutomator(
            "new UiScrollable(new UiSelector().scrollable(true)).scrollTextIntoView(\"" + text + "\")"));
    }

    protected WebElement scrollIntoViewByDescription(String description){
        return driver.findElement(AppiumBy.androidUIAutomator(
            "new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().description(\"" + description + "\"))"));
    }

    protected WebElement scrollIntoViewByResourceId(String resourceId){
        return driver.findElement(AppiumBy.androidUIAutomator(
            "new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().resourceId(\"" + resourceId + "\"))"));
    }

    protected boolean scrollUntilVisible(WebElement locator, int maxSwipes){
        for(int i=0; i<maxSwipes; i++){
            try {
                WebElement el = locator;
                if(el.isDisplayed()){
                    return true;
                }
            } catch(Exception ignored){}
            swipeUp(0.6);
        }
        return false;
    }

    // ===================== Gestures =====================
    protected void tap(WebElement element){
        Point center = getElementCenter(element);
        tapByCoordinates(center.getX(), center.getY());
    }

    protected void longPress(WebElement element, Duration duration){
        Point center = getElementCenter(element);
        PointerInput finger = new PointerInput(PointerInput.Kind.TOUCH, "finger");
        Sequence pressHold = new Sequence(finger, 1);
        pressHold.addAction(finger.createPointerMove(Duration.ZERO, PointerInput.Origin.viewport(), center.getX(), center.getY()));
        pressHold.addAction(finger.createPointerDown(PointerInput.MouseButton.LEFT.asArg()));
        pressHold.addAction(finger.createPointerMove(duration, PointerInput.Origin.viewport(), center.getX(), center.getY()));
        pressHold.addAction(finger.createPointerUp(PointerInput.MouseButton.LEFT.asArg()));
        driver.perform(Arrays.asList(pressHold));
    }

    protected void tapByCoordinates(int x, int y){
        PointerInput finger = new PointerInput(PointerInput.Kind.TOUCH, "finger");
        Sequence tap = new Sequence(finger, 1);
        tap.addAction(finger.createPointerMove(Duration.ZERO, PointerInput.Origin.viewport(), x, y));
        tap.addAction(finger.createPointerDown(PointerInput.MouseButton.LEFT.asArg()));
        tap.addAction(finger.createPointerUp(PointerInput.MouseButton.LEFT.asArg()));
        driver.perform(Arrays.asList(tap));
    }

    protected Point getElementCenter(WebElement element){
        Point loc = element.getLocation();
        Dimension size = element.getSize();
        return new Point(loc.getX() + size.width/2, loc.getY() + size.height/2);
    }

    // ===================== Keyboard & Navigation =====================
    protected void hideKeyboardIfShown(){
        try {
            driver.hideKeyboard();
        } catch (Exception ignored) {}
    }

    protected void navigateBack(){
        driver.navigate().back();
    }

    // ===================== Context Helpers =====================
    protected String getCurrentContext(){
        return driver.getContext();
    }

    protected void switchToNative(){
        for(String ctx : driver.getContextHandles()){
            if(ctx.toUpperCase().contains("NATIVE")){
                driver.context(ctx);
                return;
            }
        }
    }

    protected void switchToWebView(){
        for(String ctx : driver.getContextHandles()){
            if(ctx.toUpperCase().contains("WEBVIEW")){
                driver.context(ctx);
                return;
            }
        }
    }

    protected void switchToContext(String contextName){
        driver.context(contextName);
    }

    // ===================== Highlight (WEBVIEW only) =====================

    protected void highlightElement(WebElement element){
		try {
			if(getCurrentContext().toUpperCase().contains("WEBVIEW")){
				JavascriptExecutor js = (JavascriptExecutor) driver;
				String originalStyle = (String) js.executeScript("var el=arguments[0]; var orig=el.getAttribute('style'); el.setAttribute('style', (orig?orig+';':'') + 'outline:3px solid #00FF00;'); return orig;", element);
				try {
					Thread.sleep(200);
				} catch (InterruptedException ie){
					Thread.currentThread().interrupt();
				}
				js.executeScript("arguments[0].setAttribute('style', arguments[1]);", element, originalStyle);
			}
		} catch (Exception ignored) {}
    }

    // ===================== Activity Wait (Android) =====================
    protected boolean waitUntilActivityIs(String activityName, Duration timeout){
        long end = System.currentTimeMillis() + timeout.toMillis();
        while(System.currentTimeMillis() < end){
            try {
                if(activityName.equalsIgnoreCase(driver.currentActivity())){
                    return true;
                }
            } catch (Exception ignored) {}
            try {
                Thread.sleep(250);
            } catch (InterruptedException ie){
                Thread.currentThread().interrupt();
                break;
            }
        }
        return false;
    }

    // ===================== Utilities =====================
    protected AndroidDriver getDriver(){
        return this.driver;
    }

	// ===================== App Idle / Full Load Waits =====================
	/**
	 * Waits until the app appears "idle".
	 * - In WEBVIEW: waits for document.readyState === 'complete' and no pending jQuery requests (if present),
	 *   and keeps that state stable for the given stablePeriod.
	 * - In NATIVE: waits until the XML page source remains unchanged for the given stablePeriod.
	 *
	 * @param timeout      overall timeout to give up
	 * @param stablePeriod how long the state must remain stable (no changes)
	 * @return true if idle detected within timeout, false otherwise
	 */
	protected boolean waitTillAppIdle(Duration timeout, Duration stablePeriod){
		String ctx = "";
		try {
			ctx = getCurrentContext();
		} catch (Exception ignored){}
		if(ctx != null && ctx.toUpperCase().contains("WEBVIEW")){
			return waitForWebViewStable(timeout, stablePeriod);
		}
		return waitForNativeIdle(timeout, stablePeriod);
	}

	/**
	 * WEBVIEW-only: waits until DOM is fully loaded and any common JS frameworks are idle,
	 * then verifies that state remains stable for stablePeriod.
	 */
	private boolean waitForWebViewStable(Duration timeout, Duration stablePeriod){
		long endAt = System.currentTimeMillis() + timeout.toMillis();
		long stableSince = -1L;
		while(System.currentTimeMillis() < endAt){
			boolean isReadyAndIdle = false;
			try {
				JavascriptExecutor js = (JavascriptExecutor) driver;
				Object result = js.executeScript(
					"try {\n" +
					"  var ready = (document.readyState === 'complete');\n" +
					"  var jqIdle = (typeof window.jQuery === 'undefined') ? true : (window.jQuery.active === 0);\n" +
					"  var ngIdle = true;\n" +
					"  if (window.angular && typeof window.getAllAngularTestabilities === 'function') {\n" +
					"    ngIdle = window.getAllAngularTestabilities().every(function (t) { return t.isStable(); });\n" +
					"  }\n" +
					"  return !!(ready && jqIdle && ngIdle);\n" +
					"} catch (e) { return false; }"
				);
				isReadyAndIdle = Boolean.TRUE.equals(result);
			} catch (Exception ignored){}

			long now = System.currentTimeMillis();
			if(isReadyAndIdle){
				if(stableSince < 0L){
					stableSince = now;
				}
				if(now - stableSince >= stablePeriod.toMillis()){
					return true;
				}
			} else {
				stableSince = -1L;
			}

			try {
				Thread.sleep(250);
			} catch (InterruptedException ie){
				Thread.currentThread().interrupt();
				break;
			}
		}
		return false;
	}

	/**
	 * NATIVE context: waits until page source remains unchanged for stablePeriod.
	 * This is a pragmatic proxy for "no more UI updates happening".
	 */
	private boolean waitForNativeIdle(Duration timeout, Duration stablePeriod){
		long endAt = System.currentTimeMillis() + timeout.toMillis();
		String lastSource = null;
		long stableSince = -1L;
		while(System.currentTimeMillis() < endAt){
			String currentSource;
			try {
				currentSource = driver.getPageSource();
			} catch (Exception e){
				currentSource = null;
			}

			long now = System.currentTimeMillis();
			if(currentSource != null && currentSource.equals(lastSource)){
				if(stableSince < 0L){
					stableSince = now;
				}
				if(now - stableSince >= stablePeriod.toMillis()){
					return true;
				}
			} else {
				lastSource = currentSource;
				stableSince = -1L;
			}

			try {
				Thread.sleep(300);
			} catch (InterruptedException ie){
				Thread.currentThread().interrupt();
				break;
			}
		}
		return false;
	}
}
