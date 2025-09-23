package demo;

import java.time.Duration;
import io.appium.java_client.TouchAction;
import io.appium.java_client.android.AndroidDriver;
import io.appium.java_client.touch.WaitOptions;
import io.appium.java_client.touch.offset.PointOption;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.testng.annotations.Test;
import io.appium.java_client.AppiumBy;
import utility.BaseTest;
import LoginPage.LoginPage;
import PopupPages.PopupPages;

public class tests extends BaseTest {
	
	// no thanks >> //android.widget.Button[@resource-id="android:id/button2"]

	@Test
	public void fs() throws InterruptedException  {
		
		LoginPage loginPage = new LoginPage(driver);
		PopupPages popupPages = new PopupPages(driver);
		loginPage.login("aniket.khandizod+nucg6h8ufuirryg@sell.do", "amura@123");
		popupPages.clickWhatsNewPopup();

		WebDriverWait wait = new  WebDriverWait(driver,Duration.ofSeconds(100));
		wait.until(ExpectedConditions.visibilityOf(driver.findElement(AppiumBy.xpath("//android.widget.Button[@content-desc='Refresh']"))));
		driver.findElement(AppiumBy.xpath("//android.widget.Button[@content-desc='Refresh']")).click();
		driver.findElement(AppiumBy.xpath("(//android.widget.FrameLayout[@resource-id=\"com.amura.selldo.staging:id/card_item_stats\"])[1]")).click();
		wait.until(ExpectedConditions.visibilityOf(driver.findElement(AppiumBy.xpath("//android.widget.ImageButton[@resource-id='com.amura.selldo.staging:id/fab_add_lead']"))));

		driver.findElement(AppiumBy.xpath("//android.widget.ImageButton[@resource-id='com.amura.selldo.staging:id/fab_add_lead\']")).click();
		driver.findElement(AppiumBy.xpath("//android.widget.EditText[@resource-id=\"com.amura.selldo.staging:id/input_first_name\"]")).sendKeys("Aniket");
		driver.findElement(AppiumBy.xpath("//android.widget.EditText[@resource-id=\"com.amura.selldo.staging:id/input_last_name\"]")).sendKeys("Test");
		driver.findElement(AppiumBy.xpath("//android.widget.EditText[@resource-id=\"com.amura.selldo.staging:id/input_email\"]")).sendKeys("qwer@qwer.sdfgh");
		driver.findElement(AppiumBy.xpath("//android.widget.EditText[@resource-id=\"com.amura.selldo.staging:id/input_phone\"]")).sendKeys("9900993323");
		
		// Select Campaign
		scrollByPixels(driver,10,0,0,0);
		wait.until(ExpectedConditions.visibilityOf(driver.findElement(AppiumBy.xpath("//android.widget.EditText[@resource-id=\\\"com.amura.selldo.staging:id/input_campaign\\\"]"))));
		driver.findElement(AppiumBy.xpath("//android.widget.EditText[@resource-id=\"com.amura.selldo.staging:id/input_campaign\"]")).click();
		driver.findElements(AppiumBy.xpath("(//android.view.ViewGroup[@resource-id=\"com.amura.selldo.staging:id/constraint_root_dialog_list\"])")).stream().filter(S->S.getText().equalsIgnoreCase("Organic")).findFirst().get().click();
		driver.findElement(AppiumBy.xpath("//android.widget.Button[@resource-id=\"com.amura.selldo.staging:id/positive_button_dialog\"]")).click();
		
		// Save lead
		driver.findElement(AppiumBy.xpath("//android.widget.Button[@resource-id=\"com.amura.selldo.staging:id/button_add_lead\"]")).click();
		wait.until(ExpectedConditions.invisibilityOf(driver.findElement(AppiumBy.xpath("//android.widget.Button[@resource-id=\\\"com.amura.selldo.staging:id/button_add_lead\\\"]"))));
		
	} 
	
	public void scrollByPixels(AndroidDriver driver, int startX, int startY, int endX, int endY) {
	    TouchAction action = new TouchAction(driver);
	    action
	        .press(PointOption.point(startX, startY))
	        .waitAction(WaitOptions.waitOptions(Duration.ofMillis(800))) // hold for smoothness
	        .moveTo(PointOption.point(endX, endY))
	        .release()
	        .perform();
	}
}

