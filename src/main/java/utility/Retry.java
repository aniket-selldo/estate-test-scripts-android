package utility;

import org.testng.IRetryAnalyzer;
import org.testng.ITestResult;

public class Retry implements IRetryAnalyzer {
	int retrycount = 0;
	int maxretyrcount = System.getProperty("user.name").equalsIgnoreCase("aniket")?0:0;

	@Override
	public boolean retry(ITestResult result) {
		// TODO Auto-generated method stub
		if (retrycount < maxretyrcount) {
			System.out.println(ConsoleColors.RED_BOLD_BRIGHT + "Retrying test " + ConsoleColors.BLUE_BOLD_BRIGHT
					+ result.getName() + ConsoleColors.RED_BOLD_BRIGHT + " with status "
					+ ConsoleColors.BLUE_BOLD_BRIGHT + getResultStatusName(result.getStatus())
					+ ConsoleColors.RED_BOLD_BRIGHT + " for the " + ConsoleColors.BLUE_BOLD_BRIGHT + (retrycount + 1)
					+ ConsoleColors.RED_BOLD_BRIGHT + " time(s). For Method >> " + ConsoleColors.BLUE_BOLD_BRIGHT
					+ result.getMethod() + ConsoleColors.RESET);

			retrycount++;
			return true;
		}

		return false;
	}

	public String getResultStatusName(int status) {
		String resultName = null;
		if (status == 1)
			resultName = ConsoleColors.GREEN_BOLD_BRIGHT + "SUCCESS" + ConsoleColors.RESET;
		if (status == 2)
			resultName = ConsoleColors.RED_BOLD_BRIGHT + "FAILURE" + ConsoleColors.RESET;
		if (status == 3)
			resultName = ConsoleColors.YELLOW_BOLD_BRIGHT + "SKIP" + ConsoleColors.RESET;
		return resultName;
	}
}
