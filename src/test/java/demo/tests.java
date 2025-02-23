package demo;

import org.testng.annotations.Test;

import io.appium.java_client.AppiumBy;
import utility.BaseTest;

public class tests extends BaseTest {

	@Test
	public void fs() throws InterruptedException  {
		driver.findElement(AppiumBy.id("com.amura.selldo.staging:id/input_email")).sendKeys("aniket.khandizod+h@sell.do");
		driver.findElement(AppiumBy.id("com.amura.selldo.staging:id/input_password")).sendKeys("amura@123");
		driver.findElement(AppiumBy.id("com.amura.selldo.staging:id/button_sign_in")).click();
	} 
}
