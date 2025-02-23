package utility;

import java.io.File;
import java.net.MalformedURLException;
import java.net.URI;
import java.net.URISyntaxException;
import java.time.Duration;

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

		
		File mainJsPath = new File(System.getProperty("user.home")+"/AppData/Roaming/npm/node_modules/appium/build/lib/main.js");
		String apkFilePath = System.getProperty("user.dir")+"/resources/ESTATE-16655-DEV-debug-260-7.9.apk";
		String IPAdress = "127.0.0.1";
		int port = 4723;
		String virtualDeviceName = "Pixel 8 Pro API 35";
		
		// Trigger Server
		service = new AppiumServiceBuilder().withAppiumJS(mainJsPath).withIPAddress(IPAdress).usingPort(port).build();
		service.start();
		
		// Configurations
		UiAutomator2Options  options = new UiAutomator2Options();
		options.setDeviceName(virtualDeviceName); 
		options.setApp(apkFilePath);
		options.setCapability("autoGrantPermissions", true);
		
		// Trigger Driver
		driver = new AndroidDriver(new URI("http://"+IPAdress+":"+port).toURL(),options);
		
		// Set Implicitly Wait
		driver.manage().timeouts().implicitlyWait(Duration.ofSeconds(120));

	}

	@AfterTest
	public void KillConfiguration() {
		driver.quit();
		service.stop();
	}
}
