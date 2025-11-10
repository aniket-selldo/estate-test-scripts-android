package Pages;

import io.appium.java_client.android.AndroidDriver;
import org.openqa.selenium.WebElement;
import io.appium.java_client.pagefactory.AndroidFindBy;
import io.appium.java_client.pagefactory.AppiumFieldDecorator;
import org.openqa.selenium.support.PageFactory;
import utility.ReusableUtils;
public class PopupPages extends ReusableUtils {

    private AndroidDriver driver;

    public PopupPages(AndroidDriver driver) {
        super(driver);
        this.driver = driver;
        PageFactory.initElements(new AppiumFieldDecorator(driver, java.time.Duration.ofSeconds(20)), this);
    }

    @AndroidFindBy(xpath = "//android.widget.Button[@resource-id='android:id/button2']")
    private WebElement newVersionUpdatePopup;
    @AndroidFindBy(id = "com.amura.selldo.staging:id/image_dialog_close")
    private WebElement whatsNewUpdatePopup;

    public void clickNewVersionUpdatePopup() {
        if(isDisplayed(this.newVersionUpdatePopup)){
            this.newVersionUpdatePopup.click();
        }
    }

    public void clickWhatsNewPopup() {
        try {
            waitUntilElementClickable(this.whatsNewUpdatePopup).click();
        } catch (Exception e) {
            // TODO: handle exception
        }
    }

}
