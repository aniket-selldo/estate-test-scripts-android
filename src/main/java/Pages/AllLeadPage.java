package Pages;

import io.appium.java_client.android.AndroidDriver;
import org.openqa.selenium.WebElement;
import io.appium.java_client.pagefactory.AndroidFindBy;
import io.appium.java_client.pagefactory.AppiumFieldDecorator;
import org.openqa.selenium.support.PageFactory;
import utility.ReusableUtils;
public class AllLeadPage extends ReusableUtils {

    private AndroidDriver driver;
    public AllLeadPage(AndroidDriver driver) {
        super(driver);
        this.driver = driver;
        PageFactory.initElements(new AppiumFieldDecorator(driver), this);
    }

    // Add button Elements
    @AndroidFindBy(id = "com.amura.selldo.staging:id/fab_add_lead")
    private WebElement addButton;
    @AndroidFindBy(id = "com.amura.selldo.staging:id/fab_add_lead")
    private WebElement addNewLeadButton;

    public void clickOnAddButton() {
        waitUntilElementClickable(addButton).click();
    }


}
