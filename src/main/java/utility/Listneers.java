package utility;

import java.io.File;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

import org.testng.ITestContext;
import org.testng.ITestListener;
import org.testng.ITestResult;

import com.aventstack.extentreports.ExtentReports;
import com.aventstack.extentreports.ExtentTest;
import com.aventstack.extentreports.Status;

import io.appium.java_client.android.AndroidDriver;

public class Listneers extends BaseTest implements ITestListener {

	ExtentTest test;
	ThreadLocal<ExtentTest> extentTest = new ThreadLocal<ExtentTest>(); // Thread safe
	ExtentReports extent = ExtentReporterNG.getReportObject();
	PDFReporter pdf = new PDFReporter();

	// Console formatting helpers
	private static final AtomicInteger startedCounter = new AtomicInteger(0);
	private static volatile int totalTests = 0;
	private static volatile int workers = 1;
	private static final Map<String, Long> testStartTimes = new ConcurrentHashMap<>();
	private static final Map<String, Integer> testIndexByKey = new ConcurrentHashMap<>();
	private static final String ERASE_LINE = "\u001B[2K";
	private static final boolean USE_ASCII_ICONS =
			System.getProperty("os.name", "").toLowerCase().contains("win");

	private static String iconPending() { return USE_ASCII_ICONS ? "..." : "⏳"; }
	private static String iconPass()    { return USE_ASCII_ICONS ? "[PASS]" : "✅"; }
	private static String iconFail()    { return USE_ASCII_ICONS ? "[FAIL]" : "❌"; }
	private static String iconRetry()   { return USE_ASCII_ICONS ? "[RETRY]" : "🔁"; }

	private static void printStatusInline(String coloredText) {
		// Move to start of line, erase it, print text without newline
		System.out.print("\r" + ERASE_LINE + coloredText);
		System.out.flush();
	}

	private static void printlnStatus(String coloredText) {
		// Move to start of line, erase it, print text and end the line
		System.out.print("\r" + ERASE_LINE + coloredText + System.lineSeparator());
		System.out.flush();
	}

	private static String formatDuration(long millis) {
		if (millis < 1000) {
			return millis + "ms";
		}
		double seconds = millis / 1000.0;
		return String.format("%.1fs", seconds);
	}

	private static String toFilePath(ITestResult result) {
		String className = result.getTestClass().getRealClass().getName(); // e.g., demo.CreateNewLeadTest
		String path = "src" + File.separator + "test" + File.separator + "java" + File.separator
				+ className.replace('.', File.separatorChar) + ".java";
		return path;
	}

	private static String getDeviceLabel(AndroidDriver driver) {
		try {
			if (driver == null) return "android";
			Object platform = driver.getCapabilities().getCapability("platformName");
			Object device = driver.getCapabilities().getCapability("deviceName");
			String platformStr = platform != null ? platform.toString().toLowerCase() : "android";
			String deviceStr = device != null ? device.toString() : "";
			if (deviceStr.isEmpty()) return platformStr;
			return platformStr + " - " + deviceStr;
		} catch (Exception e) {
			return "android";
		}
	}

	private static String uniqueKey(ITestResult result) {
		return result.getMethod().getQualifiedName() + "#" + result.getStartMillis();
	}

	@Override
	public void onStart(ITestContext context) {
		pdf.initializeReport();
		// extentTest.get().log(Status.INFO, "Test Start");
		try {
			totalTests = context.getAllTestMethods() != null ? context.getAllTestMethods().length : 0;
			workers = context.getCurrentXmlTest() != null ? context.getCurrentXmlTest().getThreadCount() : 1;
		} catch (Exception e) {
			totalTests = 0;
			workers = 1;
		}
		String testsWord = totalTests == 1 ? "test" : "tests";
		String workersWord = workers == 1 ? "worker" : "workers";
		System.out.println(ConsoleColors.CYAN_BOLD + String.format("Running %d %s using %d %s",
				totalTests, testsWord, workers, workersWord) + ConsoleColors.RESET);
	}

	@Override
	public void onTestStart(ITestResult result) {
		pdf.startTest(result.getName());
		String reportPath = System.getProperty("user.dir") + File.separator + "reports";
		File reportDir = new File(reportPath);
		if (!reportDir.exists()) {
			reportDir.mkdirs();
		}
		File[] existing = reportDir.listFiles();
		if (existing != null) {
			for (File file : existing) {
				if (file.isFile() && file.exists()) {
					file.deleteOnExit();
				}
			}
		}
		test = extent.createTest(result.getMethod().getMethodName());
		extentTest.set(test);// unique thread id(ErrorValidationTest)->test

		// Console line - progress
		int index = startedCounter.incrementAndGet();
		String key = uniqueKey(result);
		testStartTimes.put(key, System.currentTimeMillis());
		testIndexByKey.put(key, index);
		AndroidDriver currentDriver = null;
		try {
			currentDriver = (AndroidDriver) result.getTestClass().getRealClass().getField("driver").get(result.getInstance());
		} catch (Exception ignored) {}
		String device = getDeviceLabel(currentDriver);
		String filePath = toFilePath(result);
		String testName = result.getMethod().getMethodName();
		// Intentionally do not print a start line to avoid duplicate lines in consoles
		// that do not respect carriage-return in-place updates (e.g., some Windows setups).
		// A single final line will be printed on test completion.
	}

	@Override
	public void onTestSuccess(ITestResult result) {
		pdf.addTestResult(result, null);
		extentTest.get().log(Status.PASS, "Test Passed");

		// Console line - pass
		long duration = result.getEndMillis() > 0 && result.getStartMillis() > 0
				? (result.getEndMillis() - result.getStartMillis())
				: (System.currentTimeMillis() - testStartTimes.getOrDefault(uniqueKey(result), System.currentTimeMillis()));
		int index = testIndexByKey.getOrDefault(uniqueKey(result), startedCounter.get());
		AndroidDriver currentDriver = null;
		try {
			currentDriver = (AndroidDriver) result.getTestClass().getRealClass().getField("driver").get(result.getInstance());
		} catch (Exception ignored) {}
		String device = getDeviceLabel(currentDriver);
		String filePath = toFilePath(result);
		String testName = result.getMethod().getMethodName();
		String line = String.format("%s %d [%s] %s %s %s",
				iconPass(), index, device, filePath, testName, formatDuration(duration));
		printlnStatus(ConsoleColors.GREEN_BOLD + line + ConsoleColors.RESET);
		testIndexByKey.remove(uniqueKey(result));
	}

	@Override
	public void onTestFailure(ITestResult result) {

		try {
			driver = (AndroidDriver) result.getTestClass().getRealClass().getField("driver").get(result.getInstance());
		} catch (Exception e1) {
		}

		String filePath = null;
		String filePathTrimmed = null;
		try {
			pdf.addTestResult(result, driver);
			filePath = getScreenshot(result.getMethod().getMethodName(), driver);
			if (filePath != null && !filePath.trim().isEmpty() && new File(filePath).exists()) {
				filePathTrimmed = new File(filePath).getName();
			}
		} catch (Exception e) {
		}
		if (filePathTrimmed != null && !filePathTrimmed.trim().isEmpty()) {
			extentTest.get().addScreenCaptureFromPath(filePathTrimmed, result.getMethod().getMethodName());
		}
		//pdf.addTestResult(result, null);
		extentTest.get().fail(result.getThrowable());

		// Console line - fail
		long duration = result.getEndMillis() > 0 && result.getStartMillis() > 0
				? (result.getEndMillis() - result.getStartMillis())
				: (System.currentTimeMillis() - testStartTimes.getOrDefault(uniqueKey(result), System.currentTimeMillis()));
		int index = testIndexByKey.getOrDefault(uniqueKey(result), startedCounter.get());
		String device = getDeviceLabel(driver);
		String filePath2 = toFilePath(result);
		String testName2 = result.getMethod().getMethodName();
		String line2 = String.format("%s %d [%s] %s %s %s",
				iconFail(), index, device, filePath2, testName2, formatDuration(duration));
		printlnStatus(ConsoleColors.RED_BOLD + line2 + ConsoleColors.RESET);
		testIndexByKey.remove(uniqueKey(result));
	}

	@Override
	public void onTestSkipped(ITestResult result) {
		pdf.addTestResult(result, null);
		extentTest.get().log(Status.SKIP, "Retry Test");

		// Console line - skipped/retry
		long duration = result.getEndMillis() > 0 && result.getStartMillis() > 0
				? (result.getEndMillis() - result.getStartMillis())
				: 0L;
		AndroidDriver currentDriver = null;
		try {
			currentDriver = (AndroidDriver) result.getTestClass().getRealClass().getField("driver").get(result.getInstance());
		} catch (Exception ignored) {}
		int index = testIndexByKey.getOrDefault(uniqueKey(result), startedCounter.get());
		String device = getDeviceLabel(currentDriver);
		String filePath = toFilePath(result);
		String testName = result.getMethod().getMethodName();
		String timeText = duration > 0 ? formatDuration(duration) : "";
		String line = String.format("%s %d [%s] %s %s %s",
				iconRetry(), index, device, filePath, testName, timeText);
		printlnStatus(ConsoleColors.YELLOW_BOLD + line + ConsoleColors.RESET);
	}

	@Override
	public void onTestFailedButWithinSuccessPercentage(ITestResult result) {

	}

	@Override
	public void onFinish(ITestContext context) {

		extent.flush();
		pdf.endReport();
		ZipCompress.compress(System.getProperty("user.dir") + File.separator + "reports", "HTML_Report");
		ZipCompress.compress(pdf.PDF_REPORT_PATH, "PDF_Report");

		// Colored summary similar to Maven/Surefire line
		try {
			int passed = context.getPassedTests() != null ? context.getPassedTests().getAllResults().size() : 0;
			int failed = context.getFailedTests() != null ? context.getFailedTests().getAllResults().size() : 0;
			int skipped = context.getSkippedTests() != null ? context.getSkippedTests().getAllResults().size() : 0;
			int errors = context.getFailedConfigurations() != null ? context.getFailedConfigurations().getAllResults().size() : 0;
			int total = passed + failed + skipped;

			long elapsedMs = 0L;
			try {
				if (context.getStartDate() != null && context.getEndDate() != null) {
					elapsedMs = context.getEndDate().getTime() - context.getStartDate().getTime();
				}
			} catch (Exception ignored) {}

			String suiteName = (context.getSuite() != null && context.getSuite().getName() != null)
					? context.getSuite().getName()
					: "TestSuite";

			String failuresColored = (failed > 0 || errors > 0)
					? ConsoleColors.RED_BOLD + String.valueOf(failed) + ConsoleColors.RESET
					: ConsoleColors.GREEN_BOLD + String.valueOf(failed) + ConsoleColors.RESET;
			String errorsColored = (errors > 0)
					? ConsoleColors.RED_BOLD + String.valueOf(errors) + ConsoleColors.RESET
					: ConsoleColors.GREEN_BOLD + String.valueOf(errors) + ConsoleColors.RESET;
			String skippedColored = (skipped > 0)
					? ConsoleColors.YELLOW_BOLD + String.valueOf(skipped) + ConsoleColors.RESET
					: ConsoleColors.GREEN_BOLD + String.valueOf(skipped) + ConsoleColors.RESET;
			String totalColored = ConsoleColors.CYAN_BOLD + String.valueOf(total) + ConsoleColors.RESET;
			String timeColored = ConsoleColors.CYAN_BOLD + formatDuration(Math.max(0L, elapsedMs)) + ConsoleColors.RESET;

			String summary = String.format("Tests run: %s, Failures: %s, Errors: %s, Skipped: %s, Time elapsed: %s -- in %s",
					totalColored, failuresColored, errorsColored, skippedColored, timeColored, suiteName);
			System.out.println(summary);
		} catch (Exception ignored) {}
	}

}
