package utility;

import java.io.File;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URI;
import java.net.URISyntaxException;
import java.time.Duration;

import org.apache.commons.io.FileUtils;
import org.openqa.selenium.OutputType;
import org.openqa.selenium.TakesScreenshot;
import org.openqa.selenium.WebDriver;
import org.testng.annotations.AfterSuite;
import org.testng.annotations.AfterTest;
import org.testng.annotations.BeforeSuite;
import org.testng.annotations.BeforeTest;

import io.appium.java_client.android.AndroidDriver;
import io.appium.java_client.android.options.UiAutomator2Options;
import io.appium.java_client.service.local.AppiumDriverLocalService;
import io.appium.java_client.service.local.AppiumServiceBuilder;

public class BaseTest {

	protected AndroidDriver driver;
	protected AppiumDriverLocalService service;
	private static UiAutomator2Options options;
	private static final File mainJsPath = new File(
			System.getProperty("user.home") + "/AppData/Roaming/npm/node_modules/appium/build/lib/main.js");
	private static final String apkFilePath = System.getProperty("user.dir")
			+ "/resources/ESTATE-16655-DEV-debug-260-7.9.apk";
	private static final String IPAdress = "127.0.0.1";
	private static final int port = 4723;
	private static final String virtualDeviceName = "AndroidPhone";
	private static final boolean triggerServer = false;

	@BeforeSuite(alwaysRun = true)
	public void serverSetup() {
		if(triggerServer){
			// Trigger Server
			service = new AppiumServiceBuilder().withAppiumJS(mainJsPath).withIPAddress(IPAdress).usingPort(port).build();
			service.start();
		}
		// Configurations
		options = new UiAutomator2Options();
		options.setDeviceName(virtualDeviceName);
		options.setApp(apkFilePath);
		options.setCapability("autoGrantPermissions", true);
	}

	@BeforeTest(alwaysRun = true)
	public void TriggerConfiguration() throws MalformedURLException, URISyntaxException {

		// Trigger Driver
		driver = new AndroidDriver(new URI("http://" + IPAdress + ":" + port).toURL(), options);

		// Set Implicitly Wait
		driver.manage().timeouts().implicitlyWait(Duration.ofSeconds(120));

	}

	@AfterTest(alwaysRun = true)
	public void KillConfiguration() {
		driver.quit();
	}

	@AfterSuite(alwaysRun = true)
	public void serverKill() {
		if(triggerServer){
			service.stop();
		}
	}

	public String getScreenshot(String fileName, WebDriver driver) {
		TakesScreenshot ts = (TakesScreenshot) driver;
		File file = ts.getScreenshotAs(OutputType.FILE);
		File filee = new File(
				System.getProperty("user.dir") + File.separator + "reports" + File.separator + fileName + ".png");
		try {
			FileUtils.copyFile(file, filee);
		} catch (IOException e) {
			e.printStackTrace();
		}
		return System.getProperty("user.dir") + File.separator + "reports" + File.separator + fileName + ".png";
	}
}
