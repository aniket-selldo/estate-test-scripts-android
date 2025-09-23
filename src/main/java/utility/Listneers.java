package utility;

import java.io.File;

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

	@Override
	public void onStart(ITestContext context) {
		pdf.initializeReport();
		// extentTest.get().log(Status.INFO, "Test Start");
	}

	@Override
	public void onTestStart(ITestResult result) {
		pdf.startTest(result.getName());
		String reportPath = System.getProperty("user.dir") + File.separator + "reports";
		for (File file : new File(reportPath).listFiles()) {
			if (file.isFile() && file.exists()) {
				file.deleteOnExit();
			}
		}
		test = extent.createTest(result.getMethod().getMethodName());
		extentTest.set(test);// unique thread id(ErrorValidationTest)->test
	}

	@Override
	public void onTestSuccess(ITestResult result) {
		pdf.addTestResult(result, null);
		extentTest.get().log(Status.PASS, "Test Passed");
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
		//	filePathTrimmed = ".." + filePath.split(Paths.get(currentDir).getFileName().toString())[1];
			filePathTrimmed = new File(filePath).getName();
		} catch (Exception e) {
		}
		extentTest.get().addScreenCaptureFromPath(filePathTrimmed, result.getMethod().getMethodName());
		//pdf.addTestResult(result, null);
		extentTest.get().fail(result.getThrowable());
	}

	@Override
	public void onTestSkipped(ITestResult result) {
		pdf.addTestResult(result, null);
		extentTest.get().log(Status.SKIP, "Retry Test");
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
	}

}
