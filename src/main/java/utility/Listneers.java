package utility;

import java.awt.Desktop;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.Paths;

import org.apache.commons.io.FileUtils;
import org.openqa.selenium.OutputType;
import org.openqa.selenium.TakesScreenshot;
import org.openqa.selenium.WebDriver;
import org.testng.ITestContext;
import org.testng.ITestListener;
import org.testng.ITestResult;
import org.xhtmlrenderer.pdf.ITextRenderer;

import com.aventstack.extentreports.ExtentReports;
import com.aventstack.extentreports.ExtentTest;
import com.aventstack.extentreports.Status;
import com.lowagie.text.DocumentException;

import io.appium.java_client.android.AndroidDriver;

public class Listneers extends BaseTest implements ITestListener {

	ExtentTest test;
	ThreadLocal<ExtentTest> extentTest = new ThreadLocal<ExtentTest>(); // Thread safe
	ExtentReports extent = ExtentReporterNG.getReportObject();
	// --------
	ExtentTest test2;
	ThreadLocal<ExtentTest> extentTest2 = new ThreadLocal<ExtentTest>(); // Thread safe
	ExtentReports extent2 = ExtentReporterNG.getReportObjectPass();

	boolean flag = true;

	@Override
	public void onTestStart(ITestResult result) {
		String reportPath = System.getProperty("user.dir") + "/reports";
		for (File file : new File(reportPath).listFiles()) {
			if (file.isFile() && file.exists()) {
				file.deleteOnExit();
			}
		}
		test = extent.createTest(result.getMethod().getMethodName());
		extentTest.set(test);// unique thread id(ErrorValidationTest)->test
		// ---
		test2 = extent2.createTest(result.getMethod().getMethodName());
		extentTest2.set(test2);// unique thread id(ErrorValidationTest)->test
	}

	@Override
	public void onTestSuccess(ITestResult result) {
		extentTest.get().log(Status.PASS, "Test Passed");
		// ---
		extentTest2.get().log(Status.PASS, "Test Passed");
	}

	@Override
	public void onTestFailure(ITestResult result) {
		extentTest.get().fail(result.getThrowable());//
		try {
			driver = (AndroidDriver) result.getTestClass().getRealClass().getField("driver").get(result.getInstance());
		} catch (Exception e1) {
		}

		String filePath = null;
		String filePathTrimmed = null;
		try {

			filePath = getScreenshot(result.getMethod().getMethodName(), driver);
			filePathTrimmed = ".."
					+ filePath.split(Paths.get(System.getProperty("user.dir")).getFileName().toString())[1];
		} catch (Exception e) {
		}
		extentTest.get().addScreenCaptureFromPath(filePathTrimmed, result.getMethod().getMethodName());
	}

	@Override
	public void onTestSkipped(ITestResult result) {
		extentTest.get().log(Status.SKIP, "Retry Test");
	}

	@Override
	public void onTestFailedButWithinSuccessPercentage(ITestResult result) {

	}

	@Override
	public void onStart(ITestContext context) {
		// extentTest.get().log(Status.INFO, "Test Start");
	}

	@Override
	public void onFinish(ITestContext context) {

		String reportPath = System.getProperty("user.dir") + "/reports";
		String reportName = "AutomationReport.html";

		extent.flush();
		String path = reportPath + "/" + reportName;
		File htmlFile = new File(path);
		try {
			if (flag) {
				Desktop.getDesktop().browse(htmlFile.toURI());
			}
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}

//		Pass Report

		String reportPath2 = System.getProperty("user.dir") + "/reports";
		String reportName2 = "AutomationPassReport.html";

		if (System.getProperty("user.name").equalsIgnoreCase("aniket")) {
			extent2.flush();
		}
		String path2 = reportPath2 + "/" + reportName2;
		File htmlFile2 = new File(path2);
		// generatePDF(htmlFile2.getPath(),System.getProperty("user.dir")+"/asdsdad.pdf");
		try {
			if (flag) {
				Desktop.getDesktop().browse(htmlFile2.toURI());
			}
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		ZipCompress.compress(reportPath);
		// Converter.convert(htmlFile2, htmlFile2);
	}

	public void generatePDF(String inputHtmlPath, String outputPdfPath) {
		try {
			String url = new File(inputHtmlPath).toURI().toURL().toString();
			System.out.println("URL: " + url);

			OutputStream out = new FileOutputStream(outputPdfPath);

			// Flying Saucer part
			ITextRenderer renderer = new ITextRenderer();

			renderer.setDocumentFromString(url);
			renderer.layout();
			renderer.createPDF(out);

			out.close();
		} catch (DocumentException | IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}
}
