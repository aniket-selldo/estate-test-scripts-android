package utility;

import java.io.File;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URI;
import java.net.URISyntaxException;
import java.time.Duration;

import org.apache.commons.configuration2.Configuration;
import org.apache.commons.configuration2.builder.fluent.Configurations;
import org.apache.commons.configuration2.ex.ConfigurationException;
import org.apache.commons.io.FileUtils;
import org.openqa.selenium.OutputType;
import org.openqa.selenium.TakesScreenshot;
import org.openqa.selenium.WebDriver;
import org.testng.annotations.AfterTest;
import org.testng.annotations.BeforeTest;

import io.appium.java_client.android.AndroidDriver;
import io.appium.java_client.android.options.UiAutomator2Options;
import io.appium.java_client.service.local.AppiumDriverLocalService;
import io.appium.java_client.service.local.AppiumServiceBuilder;

public class BaseTest {

	protected AndroidDriver driver;
	protected AppiumDriverLocalService service;

	@BeforeTest(alwaysRun = true)
	public void TriggerConfiguration() throws MalformedURLException, URISyntaxException {

		File mainJsPath = new File(
				System.getProperty("user.home") + "/AppData/Roaming/npm/node_modules/appium/build/lib/main.js");
		String apkFilePath = System.getProperty("user.dir") + "/resources/ESTATE-16655-DEV-debug-260-7.9.apk";
		String IPAdress = "127.0.0.1";
		int port = 4723;
		String virtualDeviceName = "Pixel 8 Pro API 35";

		// Trigger Server
		service = new AppiumServiceBuilder().withAppiumJS(mainJsPath).withIPAddress(IPAdress).usingPort(port).build();
		service.start();

		// Configurations
		UiAutomator2Options options = new UiAutomator2Options();
		options.setDeviceName(virtualDeviceName);
		options.setApp(apkFilePath);
		options.setCapability("autoGrantPermissions", true);

		// Trigger Driver
		driver = new AndroidDriver(new URI("http://" + IPAdress + ":" + port).toURL(), options);

		// Set Implicitly Wait
		driver.manage().timeouts().implicitlyWait(Duration.ofSeconds(120));

	}

	@AfterTest
	public void KillConfiguration() {
		driver.quit();
		service.stop();
	}

	public Configuration prop() {
		Configurations configs = new Configurations();
		Configuration config = null;
		try {
			config = configs.properties(new File(System.getProperty("user.dir") + "/demo.properties"));
		} catch (ConfigurationException e) {
			System.out.println(ConsoleColors.RED_BOLD_BRIGHT + "Issue in Global properties" + ConsoleColors.RESET);
			e.printStackTrace();
		}

		return config;
	}

	public String getScreenshot(String fileName, WebDriver driver) {
		TakesScreenshot ts = (TakesScreenshot) driver;
		File file = ts.getScreenshotAs(OutputType.FILE);
		File filee = new File(System.getProperty("user.dir") + "/reports/" + fileName + ".png");
		try {
			FileUtils.copyFile(file, filee);
		} catch (IOException e) {
			e.printStackTrace();
		}
		return System.getProperty("user.dir") + "/reports/" + fileName + ".png";
	}
}
