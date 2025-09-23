package utility;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.TimeZone;

import org.openqa.selenium.OutputType;
import org.openqa.selenium.TakesScreenshot;
import org.openqa.selenium.WebDriver;
import org.testng.ITestResult;

import com.itextpdf.text.BaseColor;
import com.itextpdf.text.Document;
import com.itextpdf.text.DocumentException;
import com.itextpdf.text.Element;
import com.itextpdf.text.Font;
import com.itextpdf.text.Image;
import com.itextpdf.text.PageSize;
import com.itextpdf.text.Paragraph;
import com.itextpdf.text.Phrase;
import com.itextpdf.text.pdf.PdfPCell;
import com.itextpdf.text.pdf.PdfPTable;
import com.itextpdf.text.pdf.PdfWriter;

public class PDFReporter {

	public final String PDF_REPORT_PATH = System.getProperty("user.dir") + File.separator + "report" + File.separator;
	private static Document document;
	private static PdfWriter writer;
	private static List<TestResult> testResults = new ArrayList<>();
	private static final String SELLDO_HEADER_IMAGE = System.getProperty("user.dir") + File.separator + "SampleFiles" + File.separator + "selldo.jpg";

	private static class TestResult {
		String name;
		String status;
		String details;
		String screenshotPath;
		int retryCount;

		TestResult(String name, String status, String details, String screenshotPath, int retryCount) {
			this.name = name;
			this.status = status;
			this.details = details;
			this.screenshotPath = screenshotPath;
			this.retryCount = retryCount;
		}
	}

	public void initializeReport() {
		SimpleDateFormat sdf = new SimpleDateFormat("dd/MM/yyyy hh:mm:ss a");
		sdf.setTimeZone(TimeZone.getTimeZone("Asia/Kolkata"));
		
		try {
			// Create PDF Reports directory
			File pdfDir = new File(PDF_REPORT_PATH);
			if (!pdfDir.exists()) {
				pdfDir.mkdirs();
			}

			// Create PDF document
			document = new Document(PageSize.A4);
			String timestamp = new SimpleDateFormat("yyyyMMdd_HHmmss").format(new Date());
			String pdfFileName = "TestReport_" + ".pdf";

			writer = PdfWriter.getInstance(document, new FileOutputStream(PDF_REPORT_PATH + pdfFileName));
			document.open();

			// Add header image
			try {
				Image headerImage = Image.getInstance(SELLDO_HEADER_IMAGE);
				headerImage.scaleToFit(200, 100); // Adjust size as needed
				headerImage.setAlignment(Element.ALIGN_CENTER);
				headerImage.setAbsolutePosition(
					(document.getPageSize().getWidth() - headerImage.getScaledWidth()) / 2,
					document.getPageSize().getHeight() - 150 // Move image up by adjusting this value
				);
				document.add(headerImage);
				document.add(new Paragraph("\n\n\n")); // Added one more newline
			} catch (Exception e) {
				System.out.println("Could not add header image: " + e.getMessage());
			}

			// Add title
			Font titleFont = new Font(Font.FontFamily.HELVETICA, 18, Font.BOLD);
			Paragraph title = new Paragraph("Sell.Do Test Execution Report", titleFont);
			title.setAlignment(Element.ALIGN_CENTER);
			title.setSpacingBefore(30); // Increased spacing before title
			title.setSpacingAfter(20);
			document.add(title);

			// Add timestamp
			Font normalFont = new Font(Font.FontFamily.HELVETICA, 12, Font.NORMAL);
			Paragraph timestampPara = new Paragraph(
					"Generated on: " + sdf.format(new Date()), normalFont);
			timestampPara.setAlignment(Element.ALIGN_CENTER);
			timestampPara.setSpacingAfter(20);
			document.add(timestampPara);

			// Add table header
			addTableHeader();

		} catch (DocumentException | IOException e) {
			e.printStackTrace();
		}
	}

	private void addTableHeader() throws DocumentException {
		PdfPTable table = new PdfPTable(3);
		table.setWidthPercentage(100);
		
		// Set column widths - 55% for name, 15% for status, 30% for details
		float[] columnWidths = {55f, 15f, 30f};
		table.setWidths(columnWidths);

		// Add headers with center alignment
		Font headerFont = new Font(Font.FontFamily.HELVETICA, 12, Font.BOLD);
		
		PdfPCell testNameCell = new PdfPCell(new Phrase("Test Name", headerFont));
		testNameCell.setHorizontalAlignment(Element.ALIGN_LEFT);
		testNameCell.setPadding(5);
		
		PdfPCell statusCell = new PdfPCell(new Phrase("Status", headerFont));
		statusCell.setHorizontalAlignment(Element.ALIGN_CENTER);
		statusCell.setPadding(5);
		statusCell.setMinimumHeight(20); // Set minimum height for status cell
		
		PdfPCell detailsCell = new PdfPCell(new Phrase("Details", headerFont));
		detailsCell.setHorizontalAlignment(Element.ALIGN_LEFT);
		detailsCell.setPadding(5);

		table.addCell(testNameCell);
		table.addCell(statusCell);
		table.addCell(detailsCell);

		document.add(table);
		document.add(new Paragraph("\n"));
	}

	public void startTest(String testName) {

	}

	public void addTestResult(ITestResult result, WebDriver driver) {
		try {
			String testName = result.getName();
			String status;
			String details;
			String screenshotPath = null;
			int retryCount = 0;
			Retry retryAnalyzer = null;

			// Check if this is a retry attempt
			if (result.getMethod().getRetryAnalyzer(result) != null) {
				retryAnalyzer = (Retry) result.getMethod().getRetryAnalyzer(result);
				retryCount = retryAnalyzer.getRetryCount();
			}

			// Determine status based on retry count and test result
			if (result.getStatus() == ITestResult.SKIP) {
				status = "RETRY";
				details = "Test in retry mode >> " + getRetryIterationText(retryCount);
			} else if (retryCount > 0) {
				if (result.getStatus() == ITestResult.SUCCESS) {
					status = "PASS";
					details = "Test passed after retry";
				} else if (retryCount < retryAnalyzer.getMaxRetryCount()) {
					status = "RETRY";
					details = "Test in retry mode >> " + getRetryIterationText(retryCount);
				} else {
					status = "FAIL";
					details = "Test failed after all retry attempts";
				}
			} else {
				status = result.getStatus() == ITestResult.SUCCESS ? "PASS" : "FAIL";
				details = result.getThrowable() != null ? result.getThrowable().getMessage() : "Test completed successfully";
			}

			// Take screenshot for failed tests
			if (result.getStatus() == ITestResult.FAILURE && driver != null) {
				screenshotPath = takeScreenshot(driver, testName);
			}

			// Store test result
			testResults.add(new TestResult(testName, status, details, screenshotPath, retryCount));

		} catch (Exception e) {
			e.printStackTrace();
		}
	}

	private String getRetryIterationText(int retryCount) {
		if (retryCount == 0) {
			return "Initial attempt";
		}
		
		// Get the last digit for proper suffix
		int lastDigit = retryCount % 10;
		// Get the last two digits for special cases (11, 12, 13)
		int lastTwoDigits = retryCount % 100;
		
		String suffix;
		if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
			suffix = "th";
		} else {
			switch (lastDigit) {
				case 1:
					suffix = "st";
					break;
				case 2:
					suffix = "nd";
					break;
				case 3:
					suffix = "rd";
					break;
				default:
					suffix = "th";
					break;
			}
		}
		
		return retryCount + suffix ;
	}

	private String takeScreenshot(WebDriver driver, String testName) {
		try {
			TakesScreenshot ts = (TakesScreenshot) driver;
			File source = ts.getScreenshotAs(OutputType.FILE);
			String destination = PDF_REPORT_PATH + testName + "_"
					+ new SimpleDateFormat("yyyyMMdd_HHmmss").format(new Date()) + ".png";
			File finalDestination = new File(destination);
			org.apache.commons.io.FileUtils.copyFile(source, finalDestination);
			return destination;
		} catch (IOException e) {
			e.printStackTrace();
			return null;
		}
	}

	private static void addScreenshotToPDF(String screenshotPath) {
		try {
			if (screenshotPath != null) {
				Image image = Image.getInstance(screenshotPath);
				image.scaleToFit(PageSize.A4.getWidth() - 50, PageSize.A4.getHeight() / 3);
				document.add(image);
				document.add(new Paragraph("\n"));
			}
		} catch (Exception e) {
			e.printStackTrace();
		}
	}

	public void endReport() {
		try {
			// Add all test results to PDF
			PdfPTable table = new PdfPTable(3);
			table.setWidthPercentage(100);
			
			// Set column widths - 55% for name, 15% for status, 30% for details
			float[] columnWidths = {55f, 15f, 30f};
			table.setWidths(columnWidths);

			Font normalFont = new Font(Font.FontFamily.HELVETICA, 10, Font.NORMAL);
			Font statusFont = new Font(Font.FontFamily.HELVETICA, 10, Font.BOLD);

			for (TestResult result : testResults) {
				PdfPCell nameCell = new PdfPCell(new Phrase(result.name, normalFont));
				nameCell.setHorizontalAlignment(Element.ALIGN_LEFT);
				nameCell.setPadding(5);
				table.addCell(nameCell);

				PdfPCell statusCell = new PdfPCell(new Phrase(result.status, statusFont));
				statusCell.setHorizontalAlignment(Element.ALIGN_CENTER);
				statusCell.setPadding(5);
				statusCell.setMinimumHeight(20); // Set minimum height for status cell
				if (result.status.equals("PASS")) {
					statusCell.setBackgroundColor(BaseColor.GREEN);
				} else if (result.status.equals("RETRY")) {
					statusCell.setBackgroundColor(BaseColor.YELLOW);
				} else {
					statusCell.setBackgroundColor(BaseColor.RED);
				}
				table.addCell(statusCell);

				PdfPCell detailsCell = new PdfPCell(new Phrase(result.details, normalFont));
				detailsCell.setHorizontalAlignment(Element.ALIGN_LEFT);
				detailsCell.setPadding(5);
				detailsCell.setNoWrap(false); // Allow text to wrap within the cell
				table.addCell(detailsCell);

				// Add screenshot for failed tests
				if (result.status.equals("FAIL") && result.screenshotPath != null) {
					document.add(table);
					document.add(new Paragraph("\n"));
					addScreenshotToPDF(result.screenshotPath);
					table = new PdfPTable(3);
					table.setWidthPercentage(100);
					table.setWidths(columnWidths);
				}
			}

			document.add(table);

		} catch (DocumentException e) {
			e.printStackTrace();
		} finally {
			if (document != null && document.isOpen()) {
				document.close();
			}
		}
	}
}