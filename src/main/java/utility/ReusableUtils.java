package utility;

import io.appium.java_client.android.AndroidDriver;
import org.openqa.selenium.support.ui.WebDriverWait;
import java.time.Duration;

import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;

public class ReusableUtils {

    private AndroidDriver driver;
    private WebDriverWait wait;
    protected ReusableUtils(AndroidDriver driver){
        this.driver = driver;
        this.wait = new  WebDriverWait(driver,Duration.ofSeconds(120));
    }

    protected WebElement waitUntilElementVisible(WebElement element){
        wait.until(ExpectedConditions.visibilityOf(element));
        return element;
    }

    protected WebElement waitUntilElementInvisible(WebElement element){
        wait.until(ExpectedConditions.invisibilityOf(element));
        return element;
    }

    protected WebElement waitUntilElementClickable(WebElement element){
        wait.until(ExpectedConditions.elementToBeClickable(element));
        return element;
    }
    
}
