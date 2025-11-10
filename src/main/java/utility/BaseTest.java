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
import org.testng.annotations.AfterMethod;
import org.testng.annotations.BeforeSuite;
import org.testng.annotations.BeforeMethod;

import io.appium.java_client.android.AndroidDriver;
import io.appium.java_client.android.options.UiAutomator2Options;
import io.appium.java_client.service.local.AppiumDriverLocalService;
import io.appium.java_client.service.local.AppiumServiceBuilder;

import org.apache.commons.configuration2.Configuration;
import org.apache.commons.configuration2.builder.fluent.Configurations;
import org.apache.commons.configuration2.ex.ConfigurationException;
import java.security.SecureRandom;

public class BaseTest {

	protected Configuration props = prop();
	public static final String env = "v2";
	protected AndroidDriver driver;
	protected AppiumDriverLocalService service;
	private static UiAutomator2Options options;
	private static final File mainJsPath = new File(System.getProperty("user.home") + "/AppData/Roaming/npm/node_modules/appium/build/lib/main.js");
	private static final String apkFilePath = System.getProperty("user.dir") + "/resources/develop-DEV-debug-285-9.5.apk";
	private static final String IPAdress = "127.0.0.1";
	private static final int port = 4723;
	private static final String virtualDeviceName = "AndroidPhone";
	private static final boolean triggerServer = false;

	@BeforeSuite(alwaysRun = true)
	public void serverSetup() {
		if(triggerServer){
			// Trigger Server
			System.out.println(ConsoleColors.RED_BOLD_BRIGHT + "Starting server" + ConsoleColors.RESET);
			service = new AppiumServiceBuilder().withAppiumJS(mainJsPath).withIPAddress(IPAdress).usingPort(port).build();
			service.start();
		}
	}
	
	@BeforeMethod(alwaysRun = true)
	public void TriggerConfiguration() throws MalformedURLException, URISyntaxException {
		
		// Configurations
		options = new UiAutomator2Options();
		options.setDeviceName(virtualDeviceName);
		options.setApp(apkFilePath);
		options.setCapability("autoGrantPermissions", true);
		options.setCapability("noReset", false);
		
		// Trigger Driver
		System.out.println(ConsoleColors.RED_BOLD_BRIGHT + "Starting driver" + ConsoleColors.RESET);
		driver = new AndroidDriver(new URI("http://" + IPAdress + ":" + port).toURL(), options);

		// Set Implicitly Wait
		driver.manage().timeouts().implicitlyWait(Duration.ofSeconds(5));

	}

    @AfterMethod(alwaysRun = true)
    public void KillConfiguration() {
        try {
            if (driver != null) {
                driver.quit();
            }
        } catch (Exception e) {
            System.out.println(ConsoleColors.RED_BOLD_BRIGHT + "Driver not quit" + ConsoleColors.RESET);
        } finally {
            driver = null;
        }
    }

	@AfterSuite(alwaysRun = true)
	public void serverKill() {
		if(triggerServer){
			System.out.println(ConsoleColors.RED_BOLD_BRIGHT + "Killing server" + ConsoleColors.RESET);
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

	public String randomEmail() {
		String email[] = prop("Email").split("@");
		String name = email[0];
		String domain = email[1];
		return name + "+" + Random("AN", 15).toLowerCase() + "@" + domain;
	}

	public String randomGmail() {
		String email[] = prop("Gmail").split("@");
		String name = email[0];
		String domain = email[1];
		return name + "+" + Random("A", 15).toLowerCase() + "@" + domain;
	}

	public String randomPhone() {
		String phone = "" + R('7', '8', '9') + Random("N", 9);
		return phone;
	}

	public String prop(String propee) {
		String value = "";
		try {
			value = this.props.getString(propee);
		} catch (Exception e) {
		}
		return value;
	}

	public Configuration prop() {
		Configurations configs = new Configurations();
		Configuration config = null;
		try {
			config = configs.properties(new File(System.getProperty("user.dir") + File.separator + "Environments"
					+ File.separator + env + ".properties"));
		} catch (ConfigurationException e) {
			e.printStackTrace();
		}

		return config;
	}

	public String Random(int size) {
		return randomFromChars(ALPHA, size);
	}

	public String Random(String type, int size) {
		String Return = "";
		switch (type) {
		case "AN":
			Return = randomFromChars(ALPHANUM, size);
			break;// pX4Mv3KsJU
		case "A":
			Return = randomFromChars(ALPHA, size);
			break;// ZLTRqGyuXk
		case "R":
			Return = randomPrintableAscii(size);
			break;// 嚰险걻鯨贚䵧縓
		case "N":
			Return = randomFromChars(NUMERIC, size);
			break;// 3511779161
		default:
			break;
		}
		return Return;
	}

	protected String R(char... arr) {
		if (arr == null || arr.length == 0) return "";
		return String.valueOf(arr[SECURE_RANDOM.nextInt(arr.length)]);
	}

	// ===================== Random Helpers (Secure) =====================
	private static final SecureRandom SECURE_RANDOM = new SecureRandom();
	private static final char[] ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".toCharArray();
	private static final char[] NUMERIC = "0123456789".toCharArray();
	private static final char[] ALPHANUM = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".toCharArray();

	private String randomFromChars(char[] charset, int size) {
		StringBuilder sb = new StringBuilder(Math.max(0, size));
		for (int i = 0; i < size; i++) {
			char c = charset[SECURE_RANDOM.nextInt(charset.length)];
			sb.append(c);
		}
		return sb.toString();
	}

	private String randomPrintableAscii(int size) {
		// printable ASCII 32..126
		StringBuilder sb = new StringBuilder(Math.max(0, size));
		for (int i = 0; i < size; i++) {
			int code = 32 + SECURE_RANDOM.nextInt(95);
			sb.append((char) code);
		}
		return sb.toString();
	}
}
