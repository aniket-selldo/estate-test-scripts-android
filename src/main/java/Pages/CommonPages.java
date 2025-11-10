package Pages;

import io.appium.java_client.android.AndroidDriver;
import org.openqa.selenium.WebElement;
import io.appium.java_client.pagefactory.AndroidFindBy;
import io.appium.java_client.pagefactory.AppiumFieldDecorator;
import org.openqa.selenium.support.PageFactory;
import utility.ReusableUtils;
import io.appium.java_client.android.nativekey.KeyEvent;
import io.appium.java_client.android.nativekey.AndroidKey;

public class CommonPages extends ReusableUtils {
    
    private AndroidDriver driver;

    public CommonPages(AndroidDriver driver) {
        super(driver);
        this.driver = driver;
        PageFactory.initElements(new AppiumFieldDecorator(driver, java.time.Duration.ofSeconds(20)), this);
    }

    @AndroidFindBy(id = "com.amura.selldo.staging:id/text_search")
    private WebElement searchButtonOnAllLeadsPage;
    @AndroidFindBy(id = "com.amura.selldo.staging:id/input_search")
    private WebElement enterSearchText;

    public void clickOnSearchButtonOnAllLeadsPage(String searchText) throws InterruptedException {
        waitUntilElementClickable(searchButtonOnAllLeadsPage).click();
		WebElement input = waitUntilElementVisible(enterSearchText);
		input.sendKeys(searchText);
        Thread.sleep(2000);
		driver.pressKey(new KeyEvent(AndroidKey.ENTER));
    }


}
