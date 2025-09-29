package Pages;

import io.appium.java_client.android.AndroidDriver;
import org.openqa.selenium.WebElement;
import io.appium.java_client.pagefactory.AndroidFindBy;
import io.appium.java_client.pagefactory.AppiumFieldDecorator;
import org.openqa.selenium.support.PageFactory;
import utility.ReusableUtils;
public class DashBoardPage extends ReusableUtils {

    private AndroidDriver driver;

    public DashBoardPage(AndroidDriver driver) {
        super(driver);
        this.driver = driver;
        PageFactory.initElements(new AppiumFieldDecorator(driver), this);
    }

    @AndroidFindBy(xpath = "//android.widget.Button[@content-desc='Refresh']")
    private WebElement refreshButton;
    @AndroidFindBy(xpath = "//android.widget.TextView[@resource-id='com.amura.selldo.staging:id/text_title' and @text='NEW ENQUIRIES']")
    private WebElement newEnquiryButton;


    public void clickOnRefreshButton() {
        waitUntilElementClickable(refreshButton).click();
    }

    public void clickOnNewEnquiryButton() {
        waitUntilElementClickable(newEnquiryButton).click();
    }

    


}
