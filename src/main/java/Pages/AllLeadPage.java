package Pages;

import io.appium.java_client.android.AndroidDriver;
import org.openqa.selenium.WebElement;
import io.appium.java_client.pagefactory.AndroidFindBy;
import io.appium.java_client.pagefactory.AppiumFieldDecorator;
import org.openqa.selenium.support.PageFactory;
import utility.ReusableUtils;
import java.util.List;
public class AllLeadPage extends ReusableUtils {

    private AndroidDriver driver;
    public AllLeadPage(AndroidDriver driver) {
        super(driver);
        this.driver = driver;
        PageFactory.initElements(new AppiumFieldDecorator(driver, java.time.Duration.ofSeconds(20)), this);
    }

    // Add button Elements
    @AndroidFindBy(id = "com.amura.selldo.staging:id/fab_add_lead")
    private WebElement addButton;
    @AndroidFindBy(id = "com.amura.selldo.staging:id/fab_add_lead")
    private WebElement addNewLeadButton;

    // All leads page elements
    @AndroidFindBy(id = "com.amura.selldo.staging:id/text_lead_id")
    private List<WebElement> firstleadID;
    @AndroidFindBy(id = "com.amura.selldo.staging:id/leadName")
    private List<WebElement> firstleadName;
    @AndroidFindBy(id = "(//android.widget.LinearLayout[@resource-id='com.amura.selldo.staging:id/dynamicLayout']/android.widget.TextView)[2]")
    private List<WebElement> firstleadOwnerName;

    // All leads page top bar elements
    @AndroidFindBy(id = "com.amura.selldo.staging:id/text_title_lead_count")
    private WebElement totalLeadsCount;

    public void clickOnAddButton() {
        waitUntilElementClickable(addButton).click();
    }

    public String getTotalLeadsCount() {
        return waitUntilElementVisible(totalLeadsCount).getText().replaceAll("[^0-9]", "").trim();
    }

    public String getFirstLeadID() {
        return waitUntilElementVisible(firstleadID.get(0)).getText().replaceAll("[^0-9]", "").trim();
    }

    public String getFirstLeadName() {
        return waitUntilElementVisible(firstleadName.get(0)).getText().trim();
    }
    
    public String getFirstLeadOwnerName() {
        return waitUntilElementVisible(firstleadOwnerName.get(0)).getText().trim();
    }

    public void clickOnFirstLead() {
        waitUntilElementClickable(firstleadID.get(0)).click();
    }

    public void clickOnFirstLeadOwnerName() {
        waitUntilElementClickable(firstleadOwnerName.get(0)).click();
    }

}
