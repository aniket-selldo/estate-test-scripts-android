package utility;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.attribute.BasicFileAttributes;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

public class ZipCompress {
	public static void compress(String dirPath) {

		File file = new File(System.getProperty("user.dir"));
		for (File fl : file.listFiles()) {
			if (!fl.isDirectory() && (fl.getName().startsWith("reports") || fl.getName().endsWith(".xls"))
					|| fl.getName().endsWith(".zip")) {
				System.out.println(ConsoleColors.RED_BOLD_BRIGHT + "Zip File Deleted >> "
						+ ConsoleColors.PURPLE_BOLD_BRIGHT + fl.getName() + ConsoleColors.RESET);
				if (System.getProperty("user.name").equalsIgnoreCase("aniket")) {
					fl.deleteOnExit();
				}
			}
		}

		final Path sourceDir = Paths.get(dirPath);
		String TodaysDate = new SimpleDateFormat("dd_MM_YYYY hh-mm-ss a").format(new Date().getTime());
		TodaysDate = ""; // Remove this line if you want date and time with report zip
		String zipFileName = dirPath + "" + TodaysDate.concat(".zip");
		try {
			final ZipOutputStream outputStream = new ZipOutputStream(new FileOutputStream(zipFileName));
			Files.walkFileTree(sourceDir, new SimpleFileVisitor<Path>() {
				@Override
				public FileVisitResult visitFile(Path file, BasicFileAttributes attributes) {
					try {
						Path targetFile = sourceDir.relativize(file);
						outputStream.putNextEntry(new ZipEntry(targetFile.toString()));
						byte[] bytes = Files.readAllBytes(file);
						outputStream.write(bytes, 0, bytes.length);
						outputStream.closeEntry();
					} catch (IOException e) {
						e.printStackTrace();
					}
					return FileVisitResult.CONTINUE;
				}
			});
			outputStream.close();
		} catch (IOException e) {
			e.printStackTrace();
		}
	}
}
