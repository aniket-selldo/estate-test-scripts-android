package utility;

import org.testng.IRetryAnalyzer;
import org.testng.ITestResult;
import java.io.PrintWriter;
import java.io.StringWriter;

public class Retry implements IRetryAnalyzer {
	int retrycount = 0;
	int maxretyrcount = System.getProperty("user.name").equalsIgnoreCase("aniket")?0:0;
	boolean consoleError = true;

	@Override
	public boolean retry(ITestResult result) {
		if (retrycount < maxretyrcount) {
			if (consoleError && result.getStatus() == ITestResult.FAILURE) {
				Throwable throwable = result.getThrowable();
				StringWriter sw = new StringWriter();
				PrintWriter pw = new PrintWriter(sw);
				throwable.printStackTrace(pw);
				
				System.out.println("\n" + ConsoleColors.RED_BOLD_BRIGHT + "========== TEST FAILURE DETAILS ==========" + ConsoleColors.RESET);
				System.out.println(ConsoleColors.RED_BOLD_BRIGHT + "Test Name: " + ConsoleColors.BLUE_BOLD_BRIGHT + result.getName() + ConsoleColors.RESET);
				System.out.println(ConsoleColors.RED_BOLD_BRIGHT + "Test Status: " + ConsoleColors.BLUE_BOLD_BRIGHT + getResultStatusName(result.getStatus()) + ConsoleColors.RESET);
				System.out.println(ConsoleColors.RED_BOLD_BRIGHT + "Test Class: " + ConsoleColors.BLUE_BOLD_BRIGHT + result.getTestClass().getName() + ConsoleColors.RESET);
				System.out.println(ConsoleColors.RED_BOLD_BRIGHT + "Test Method: " + ConsoleColors.BLUE_BOLD_BRIGHT + result.getMethod().getMethodName() + ConsoleColors.RESET);
				System.out.println(ConsoleColors.RED_BOLD_BRIGHT + "Failure Type: " + ConsoleColors.BLUE_BOLD_BRIGHT + throwable.getClass().getName() + ConsoleColors.RESET);
				System.out.println(ConsoleColors.RED_BOLD_BRIGHT + "Error Message: " + ConsoleColors.BLUE_BOLD_BRIGHT + throwable.getMessage() + ConsoleColors.RESET);
				System.out.println(ConsoleColors.RED_BOLD_BRIGHT + "Stack Trace:" + ConsoleColors.RESET);
				System.out.println(ConsoleColors.YELLOW_BOLD_BRIGHT + sw.toString() + ConsoleColors.RESET);
				System.out.println(ConsoleColors.RED_BOLD_BRIGHT + "=========================================" + ConsoleColors.RESET + "\n");
			} else if (consoleError) {
				System.out.println("\n" + ConsoleColors.GREEN_BOLD_BRIGHT + "========== TEST EXECUTION DETAILS ==========" + ConsoleColors.RESET);
				System.out.println(ConsoleColors.GREEN_BOLD_BRIGHT + "Test Name: " + ConsoleColors.BLUE_BOLD_BRIGHT + result.getName() + ConsoleColors.RESET);
				System.out.println(ConsoleColors.GREEN_BOLD_BRIGHT + "Test Status: " + ConsoleColors.BLUE_BOLD_BRIGHT + getResultStatusName(result.getStatus()) + ConsoleColors.RESET);
				System.out.println(ConsoleColors.GREEN_BOLD_BRIGHT + "Test Class: " + ConsoleColors.BLUE_BOLD_BRIGHT + result.getTestClass().getName() + ConsoleColors.RESET);
				System.out.println(ConsoleColors.GREEN_BOLD_BRIGHT + "Test Method: " + ConsoleColors.BLUE_BOLD_BRIGHT + result.getMethod().getMethodName() + ConsoleColors.RESET);
				System.out.println(ConsoleColors.GREEN_BOLD_BRIGHT + "Retry Count: " + ConsoleColors.BLUE_BOLD_BRIGHT + (retrycount + 1) + ConsoleColors.RESET);
				System.out.println(ConsoleColors.GREEN_BOLD_BRIGHT + "=========================================" + ConsoleColors.RESET + "\n");
			}

			retrycount++;
			return true;
		}

		return false;
	}

	public int getRetryCount() {
		return retrycount;
	}

	public int getMaxRetryCount() {
		return maxretyrcount;
	}

	public String getResultStatusName(int status) {
		String resultName;
		switch (status) {
			case ITestResult.SUCCESS:
				resultName = ConsoleColors.GREEN_BOLD_BRIGHT + "SUCCESS" + ConsoleColors.RESET;
				break;
			case ITestResult.FAILURE:
				resultName = ConsoleColors.RED_BOLD_BRIGHT + "FAILURE" + ConsoleColors.RESET;
				break;
			case ITestResult.SKIP:
				resultName = ConsoleColors.YELLOW_BOLD_BRIGHT + "SKIP" + ConsoleColors.RESET;
				break;
			case ITestResult.SUCCESS_PERCENTAGE_FAILURE:
				resultName = ConsoleColors.YELLOW_BOLD_BRIGHT + "SUCCESS_PERCENTAGE_FAILURE" + ConsoleColors.RESET;
				break;
			case ITestResult.STARTED:
				resultName = ConsoleColors.BLUE_BOLD_BRIGHT + "STARTED" + ConsoleColors.RESET;
				break;
			default:
				resultName = ConsoleColors.RED_BOLD_BRIGHT + "UNKNOWN STATUS (" + status + ")" + ConsoleColors.RESET;
				break;
		}
		return resultName;
	}
}
