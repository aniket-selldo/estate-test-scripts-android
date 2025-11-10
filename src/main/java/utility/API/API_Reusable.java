package utility.API;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.text.SimpleDateFormat;
import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.apache.commons.configuration2.Configuration;
import org.apache.commons.configuration2.builder.fluent.Configurations;
import org.apache.commons.configuration2.ex.ConfigurationException;
import org.apache.commons.lang3.RandomStringUtils;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.WebDriver;

import com.github.javafaker.Faker;

import utility.ConsoleColors;
import utility.Enums.AheadOf;

public class API_Reusable {

	private Configuration config;

	API_Reusable(Configuration config) {
		this.config = config;
	}

	public boolean amura = true;

	public void findDuplicateInArrayList(ArrayList<String> str) {
		System.out.println("=====================RESULT=========================");
		// str.forEach(System.out::println);
		// 2. get duplicate count using Map
		Map<String, Integer> duplicateCountMap = str.stream()
				.collect(Collectors.toMap(Function.identity(), company -> 1, Math::addExact));
		// 2.1 print Map for duplicate count
		System.out.println("\n2. Map with Key and its duplicate count : \n");
		duplicateCountMap.forEach((key, value) -> System.out.println("Key : " + key + "\t Count : " + value));
	}

	protected static String R(char... arr) {
		return RandomStringUtils.random(1, arr);
	}

    protected static List<String> sanitizeIds(List<String> ids) {
		return ids.stream()
				.filter(s -> s != null && !s.isBlank())
				.map(s -> s.trim().replace("\"", ""))
				.collect(Collectors.toList());
	}

	public String DateTime(String time) {
		DateTimeFormatter dtf = DateTimeFormatter.ofPattern(time);// yyyy/MM/dd
		LocalDateTime now = LocalDateTime.now();
		return dtf.format(now);
	}

	public String randomEmail(String str) {
		return str + "+" + Random("AN", 10) + "@sell.do";
	}

	public String randomPAN() {
		return "" + Random("A", 5) + Random("N", 4) + Random("A", 1);
	}

	protected int getRandomNumber(int min, int max) {
		return (int) ((Math.random() * (max - min)) + min);
	}

	public String Random(int size) {
		return RandomStringUtils.randomAlphabetic(size);
	}

	public String Random(String type, int size) {
		String Return = "";
		switch (type) {
		case "AN":
			Return = RandomStringUtils.randomAlphanumeric(size);
			break;// pX4Mv3KsJU
		case "A":
			Return = RandomStringUtils.randomAlphabetic(size);
			break;// ZLTRqGyuXk
		case "R":
			Return = RandomStringUtils.random(size);
			break;// 嚰险걻鯨贚䵧縓
		case "N":
			Return = RandomStringUtils.randomNumeric(size);
			break;// 3511779161
		default:
			break;
		}
		return Return;
	}

	protected String getDate(int a, String of) {

		String s = "";
		switch (of) {
		case "D":
			s = new SimpleDateFormat("dd").format(new Date().getTime() + (a * (1000 * 60 * 60 * 24)));
			break;
		case "M":
			s = new SimpleDateFormat("M").format(new Date().getTime() + (a * (1000 * 60 * 60 * 24)));
			break;
		case "Y":
			s = new SimpleDateFormat("YYYY").format(new Date().getTime() + (a * (1000 * 60 * 60 * 24)));
			break;
		case "m":
			s = new SimpleDateFormat("mm").format(new Date().getTime() + (a * 60000));
			break;
		case "H":
			s = new SimpleDateFormat("HH").format(new Date().getTime() + (a * 3600000));
			break;

		default:
			System.out.println("please select valid input");
			break;
		}
		return s;
	}

	protected void waits(int val) {
		try {
			Thread.sleep(val);
		} catch (InterruptedException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}

	public String prop(String propee) {
		String value = "";
		try {
			value = this.config.getString(propee);
		} catch (Exception e) {
			System.out.println(
					ConsoleColors.RED_BOLD_BRIGHT + "Value for " + propee + " Not Found !" + ConsoleColors.RESET);
		}
		return value;
	}

	public static String DateTime2(String time) {
		DateTimeFormatter dtf = DateTimeFormatter.ofPattern(time);// yyyy/MM/dd
		LocalDateTime now = LocalDateTime.now();
		return dtf.format(now);
	}

	protected String getDateOf(AheadOf AO, long a, String of) {
		//return new SimpleDateFormat(of).format(new Date().getTime() + (a * AO.toInt())).trim();

		ZonedDateTime now = ZonedDateTime.now(java.time.ZoneId.of("Asia/Kolkata"));
		
		switch (AO) {
			case Day:
				return now.plusDays(a).format(java.time.format.DateTimeFormatter.ofPattern(of));
			case Houre:
				return now.plusHours(a).format(java.time.format.DateTimeFormatter.ofPattern(of));
			case Minute:
				return now.plusMinutes(a).format(java.time.format.DateTimeFormatter.ofPattern(of));
			case Second:
				return now.plusSeconds(a).format(java.time.format.DateTimeFormatter.ofPattern(of));
			case Year:
				return now.plusYears(a).format(java.time.format.DateTimeFormatter.ofPattern(of));
			default:
				return now.format(java.time.format.DateTimeFormatter.ofPattern(of));
		}
	
	}

	public static String randomEmail2() {
		String email[] = prop2("Email").split("@");
		String name = email[0];
		String domain = email[1];
		return name + "+" + Random2("AN", 10) + "@" + domain;
	}

	public static String randomEmail2(String str) {
		return str + "+" + Random2("AN", 10) + "@sell.do";
	}

	public static String randomPAN2() {
		String _4th = R('A', 'B', 'C', 'F', 'G', 'H', 'L', 'J', 'P', 'T', 'F');
		return Random2("A", 3).toUpperCase() + _4th + Random2("A", 1).toUpperCase() + Random2("N", 4)
				+ Random2("A", 1).toUpperCase();
	}

	public static String randomPhone2() {
		String num = R('7', '8', '9');
		return " " + num + Random2("N", 9);
	}

	public String Random2(int size) {
		return RandomStringUtils.randomAlphabetic(size);
	}

	public static String Random2(String type, int size) {
		String Return = "";
		switch (type) {
		case "AN":
			Return = RandomStringUtils.randomAlphanumeric(size);
			break;// pX4Mv3KsJU
		case "A":
			Return = RandomStringUtils.randomAlphabetic(size);
			break;// ZLTRqGyuXk
		case "R":
			Return = RandomStringUtils.random(size);
			break;// 嚰险걻鯨贚䵧縓
		case "N":
			Return = RandomStringUtils.randomNumeric(size);
			break;// 3511779161
		default:
			break;
		}
		return Return;
	}

	protected void deZoom(WebDriver driver) {
		JavascriptExecutor js = (JavascriptExecutor) driver;
		js.executeScript("document.body.style.zoom='80%'");
	}

	protected static String getDate2(int a, String of) {

		String s = "";
		switch (of) {
		case "D":
			s = new SimpleDateFormat("dd").format(new Date().getTime() + (a * (1000 * 60 * 60 * 24)));
			break;
		case "M":
			s = new SimpleDateFormat("M").format(new Date().getTime() + (a * (1000 * 60 * 60 * 24)));
			break;
		case "Y":
			s = new SimpleDateFormat("YYYY").format(new Date().getTime() + (a * (1000 * 60 * 60 * 24)));
			break;

		default:
			System.out.println("please select valid input");
			break;
		}
		return s;
	}

	public static String prop2(String propee) {
		Configurations configs = new Configurations();
		Configuration config = null;
		try {
			config = configs.properties(new File(System.getProperty("user.dir") + "/config.properties"));
		} catch (ConfigurationException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		return config.getString(propee);
	}

	public Faker fk() {
		return new Faker();
	}

	public String randomEmail() {
		String email[] = prop("Email").split("@");
		String name = email[0];
		String domain = email[1];
		return name + "+" + Random("AN", 10) + "@" + domain;
	}

	public String randomPhone() {
		return " " + R('7', '8', '9') + Random("N", 9);
	}

	public String getArrayByLimit(int start, int limit) {

		String s = "[";
		for (int i = start; i <= limit; i++) {
			String comma = ((limit - start) == 0) || (i == limit) ? "" : ",";
			s += "" + i + "" + comma;
		}
		s += "]";

		System.out.println(s);
		return s;

	}

	public void ReportDate() {

		String Todays = getDateOf(AheadOf.Day, 0, "dd/MM/yyyy") + " 00:00:00 - "
				+ getDateOf(AheadOf.Day, 0, "dd/MM/yyyy") + " 23:59:59 IST"; // 06/11/2024 00:00:00 - 06/11/2024
																				// 23:59:59
		String yesterday = getDateOf(AheadOf.Day, -1, "dd/MM/yyyy") + " 00:00:00 - "
				+ getDateOf(AheadOf.Day, -1, "dd/MM/yyyy") + " 23:59:59 IST"; // 06/11/2024 00:00:00 - 06/11/2024
																				// 23:59:59
		String Last7Days = getDateOf(AheadOf.Day, -7, "dd/MM/yyyy") + " 00:00:00 - "
				+ getDateOf(AheadOf.Day, 0, "dd/MM/yyyy") + " 23:59:59 IST"; // 06/11/2024 00:00:00 - 06/11/2024
																				// 23:59:59
		String Last30Days = "01/" + getDateOf(AheadOf.Day, 1, "MM/yyyy") + " 00:00:00 - "
				+ getDateOf(AheadOf.Day, 0, "dd/MM/yyyy") + " 23:59:59 IST"; // 06/11/2024 00:00:00 - 06/11/2024
																				// 23:59:59

		System.out.println(Todays);
		System.out.println(yesterday);
		System.out.println(Last7Days);
		System.out.println(Last30Days);
	}

	public void writeInTextFile(String text, String ExpectedfileName) {
		String path = System.getProperty("user.home") + "/Desktop/" + ExpectedfileName;

		// Defining the file name of the file
		Path fileName = Path.of(path);

		try {
			Files.writeString(fileName, text);

			// Reading the content of the file
			String fileContent = Files.readString(fileName);

			// Printing the content inside the file
			System.out.println(fileContent);
		} catch (IOException e) {
		}
	}

	public byte[] fileToBinary(String filePath) {
		byte[] binaryData = null;
		try {
			Path path = Paths.get(filePath);
			binaryData = Files.readAllBytes(path);

			// Optional: Print the binary as 0s and 1s (not efficient for large files)
			for (byte b : binaryData) {
				//System.out.print(binary = String.format("%8s", Integer.toBinaryString(b & 0xFF)).replace(' ', '0'));
			}

		} catch (IOException e) {
			e.printStackTrace();
		}
		return binaryData;
	}

}
