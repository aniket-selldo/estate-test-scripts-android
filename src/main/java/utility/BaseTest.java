package utility;

import java.io.File;
import java.io.IOException;
import java.net.URI;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

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
	public static final String env = "app";
	protected AndroidDriver driver;
	protected AppiumDriverLocalService service;
	private static final String apkFilePath = System.getProperty("user.dir") + "/resources/develop-DEV-debug-290-9.8.apk";
	private static final String IPAddress = "127.0.0.1";
	private static final int port = 4723;
	private static final String virtualDeviceName = "Pixel 9 Pro";
	private static final Duration implicitWait = Duration.ofSeconds(5);
	private static final boolean triggerServer = getBooleanFlag("triggerServer", true);
	private static final boolean useBrowserStack = getBooleanFlag("useBrowserStack", false);
	private static final String browserStackHubUrl = getConfigValue("browserStackHubUrl",
			"https://hub-cloud.browserstack.com/wd/hub");

	@BeforeSuite(alwaysRun = true)
	public void serverSetup() {
		if (useBrowserStack) {
			System.out.println(ConsoleColors.CYAN_BOLD + "Execution target: BrowserStack Cloud" + ConsoleColors.RESET);
			if (triggerServer) {
				System.out.println(ConsoleColors.YELLOW_BOLD
						+ "triggerServer=true is ignored for BrowserStack execution."
						+ ConsoleColors.RESET);
			}
			return;
		}
		if (!triggerServer) {
			System.out.println(ConsoleColors.CYAN_BOLD
					+ "Execution target: Local Appium (existing server expected at appiumServerUrl)"
					+ ConsoleColors.RESET);
			return;
		}
		try {
			System.out.println(ConsoleColors.RED_BOLD_BRIGHT + "Starting local Appium server" + ConsoleColors.RESET);
			AppiumServiceBuilder builder = new AppiumServiceBuilder()
					.withIPAddress(IPAddress)
					.usingPort(port);

			File resolvedMainJs = resolveAppiumMainJs();
			if (resolvedMainJs != null) {
				builder.withAppiumJS(resolvedMainJs);
			}

			File nodeExecutable = resolveNodeExecutable();
			if (nodeExecutable != null) {
				builder.usingDriverExecutable(nodeExecutable);
			}

			service = builder.build();
			service.start();
			if (!service.isRunning()) {
				throw new IllegalStateException("Appium service failed to start.");
			}
		} catch (Exception e) {
			throw new RuntimeException("Unable to start local Appium server. "
					+ "Provide -DappiumMainJs or APPIUM_MAIN_JS and optionally -DnodePath when needed.", e);
		}
	}
	
	@BeforeMethod(alwaysRun = true)
	public void TriggerConfiguration() {
		try {
			UiAutomator2Options options = useBrowserStack
					? buildBrowserStackOptions()
					: buildLocalOptions();
			URI remoteUri = resolveRemoteUri();
			driver = new AndroidDriver(remoteUri.toURL(), options);
			driver.manage().timeouts().implicitlyWait(implicitWait);
		} catch (Exception e) {
			throw new RuntimeException("Unable to create AndroidDriver session. "
					+ "Verify flags/capabilities. triggerServer=" + triggerServer + ", useBrowserStack=" + useBrowserStack, e);
		}
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
		if (!useBrowserStack && triggerServer && service != null) {
			System.out.println(ConsoleColors.RED_BOLD_BRIGHT + "Stopping local Appium server" + ConsoleColors.RESET);
			try {
				if (service.isRunning()) {
					service.stop();
				}
			} catch (Exception e) {
				System.out.println(ConsoleColors.YELLOW_BOLD + "Appium server stop failed: "
						+ e.getMessage() + ConsoleColors.RESET);
			}
		}
	}

	private static boolean getBooleanFlag(String key, boolean defaultValue) {
		String systemValue = System.getProperty(key);
		if (systemValue == null || systemValue.isBlank()) {
			return defaultValue;
		}
		return Boolean.parseBoolean(systemValue.trim());
	}

	private static String getConfigValue(String key, String defaultValue) {
		String systemValue = System.getProperty(key);
		if (systemValue != null && !systemValue.isBlank()) {
			return systemValue.trim();
		}
		String envValue = System.getenv(toEnvKey(key));
		if (envValue != null && !envValue.isBlank()) {
			return envValue.trim();
		}
		return defaultValue;
	}

	private static String getSensitiveValue(String key, String envKey) {
		String value = System.getProperty(key);
		if (value != null && !value.isBlank()) {
			return value.trim();
		}
		String env = System.getenv(envKey);
		if (env != null && !env.isBlank()) {
			return env.trim();
		}
		return "";
	}

	private static URI resolveRemoteUri() {
		String remoteUrl = useBrowserStack
				? browserStackHubUrl
				: getConfigValue("appiumServerUrl", "http://" + IPAddress + ":" + port);
		return URI.create(remoteUrl);
	}

	private static String toEnvKey(String key) {
		StringBuilder sb = new StringBuilder();
		for (int i = 0; i < key.length(); i++) {
			char c = key.charAt(i);
			if (Character.isUpperCase(c) && i > 0) {
				sb.append('_');
			}
			sb.append(Character.toUpperCase(c));
		}
		return sb.toString();
	}

	private static File resolveNodeExecutable() {
		String explicitNode = getConfigValue("nodePath", "");
		if (!explicitNode.isBlank()) {
			File nodeFile = new File(explicitNode);
			return nodeFile.exists() ? nodeFile : null;
		}
		return null;
	}

	private static File resolveAppiumMainJs() {
		String explicitPath = getConfigValue("appiumMainJs", "");
		if (!explicitPath.isBlank()) {
			File explicitFile = new File(explicitPath);
			if (!explicitFile.exists()) {
				throw new IllegalStateException("Configured appiumMainJs does not exist: " + explicitPath);
			}
			return explicitFile;
		}

		List<File> candidates = new ArrayList<>();
		String userHome = System.getProperty("user.home");
		candidates.add(new File(userHome + "/AppData/Roaming/npm/node_modules/appium/build/lib/main.js"));
		candidates.add(new File("/usr/local/lib/node_modules/appium/build/lib/main.js"));
		candidates.add(new File("/usr/lib/node_modules/appium/build/lib/main.js"));

		String appiumHome = System.getenv("APPIUM_HOME");
		if (appiumHome != null && !appiumHome.isBlank()) {
			candidates.add(new File(appiumHome, "node_modules/appium/build/lib/main.js"));
			candidates.add(new File(appiumHome, "build/lib/main.js"));
		}

		for (File candidate : candidates) {
			if (candidate.exists()) {
				return candidate;
			}
		}
		return null;
	}

	private UiAutomator2Options buildLocalOptions() {
		UiAutomator2Options options = new UiAutomator2Options();
		String localDeviceName = getConfigValue("deviceName", virtualDeviceName);
		String localAppPath = getConfigValue("apkPath", apkFilePath);
		File appFile = new File(localAppPath);
		if (!appFile.exists()) {
			throw new IllegalStateException("APK not found at path: " + localAppPath
					+ ". Pass -DapkPath or APK_PATH for local execution.");
		}

		options.setDeviceName(localDeviceName);
		options.setApp(localAppPath);
		options.setCapability("autoGrantPermissions", getBooleanFlag("autoGrantPermissions", true));
		options.setCapability("noReset", getBooleanFlag("noReset", false));
		return options;
	}

	private UiAutomator2Options buildBrowserStackOptions() {
		UiAutomator2Options options = new UiAutomator2Options();
		String username = getSensitiveValue("browserStackUsername", "BROWSERSTACK_USERNAME");
		String accessKey = getSensitiveValue("browserStackAccessKey", "BROWSERSTACK_ACCESS_KEY");
		if (username.isBlank() || accessKey.isBlank()) {
			throw new IllegalStateException(
					"BrowserStack credentials are missing. Pass -DbrowserStackUsername/-DbrowserStackAccessKey "
							+ "or set BROWSERSTACK_USERNAME/BROWSERSTACK_ACCESS_KEY.");
		}

		String bsAppId = getConfigValue("browserStackAppId", "");
		if (bsAppId.isBlank()) {
			throw new IllegalStateException("BrowserStack app id is missing. Set -DbrowserStackAppId=bs://<app-id>.");
		}

		options.setCapability("app", bsAppId);
		options.setCapability("platformName", "Android");
		options.setCapability("browserstack.user", username);
		options.setCapability("browserstack.key", accessKey);
		options.setCapability("bstack:options", Map.of(
				"deviceName", getConfigValue("bsDeviceName", "Google Pixel 9 Pro"),
				"osVersion", getConfigValue("bsOsVersion", "14"),
				"projectName", getConfigValue("bsProjectName", "Sell.do"),
				"buildName", getConfigValue("bsBuildName", getConfigValue("buildTag", "Android Build")),
				"sessionName", getConfigValue("bsSessionName", "Appium Test Session"),
				"debug", getBooleanFlag("bsDebug", true),
				"networkLogs", getBooleanFlag("bsNetworkLogs", true),
				"appiumVersion", getConfigValue("bsAppiumVersion", "2.0.1")
		));
		return options;
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
