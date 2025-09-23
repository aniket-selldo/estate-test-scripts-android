package utility;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.util.Properties;

import com.aventstack.extentreports.ExtentReports;
import com.aventstack.extentreports.reporter.ExtentSparkReporter;
import com.aventstack.extentreports.reporter.configuration.Theme;

public class ExtentReporterNG {

	public static ExtentReports getReportObject() {
		Properties prop = new Properties();
		try {
			prop.load(new FileInputStream(System.getProperty("user.dir") + File.separator+"config.properties"));
		} catch (IOException e) {}

		// -----------------------------------------------------------------------------
		String path = System.getProperty("user.dir") + File.separator+"reports"+File.separator+"AutomationReport.html";
		ExtentSparkReporter reporter = new ExtentSparkReporter(path);
		reporter.config().setReportName("Sell.do Web test Results");
		reporter.config().setDocumentTitle("Sell.do Automation Report");
		reporter.config().setTheme(Theme.DARK);

		ExtentReports extent = new ExtentReports();
		extent.attachReporter(reporter);
		extent.setSystemInfo("Tester","Aniket Khandizod");
		extent.setSystemInfo("System User",System.getProperty("user.name").toUpperCase());
		extent.setSystemInfo("Email", prop.getProperty("Email"));
		extent.setSystemInfo("OS", System.getProperty("os.name"));
		extent.setSystemInfo("Environment", prop.getProperty("URL"));
		return extent;
	}
}
