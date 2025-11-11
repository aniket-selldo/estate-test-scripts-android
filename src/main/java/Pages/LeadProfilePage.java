package Pages;

import io.appium.java_client.android.AndroidDriver;
import org.openqa.selenium.WebElement;
import io.appium.java_client.pagefactory.AndroidFindBy;
import io.appium.java_client.pagefactory.AppiumFieldDecorator;
import org.openqa.selenium.support.PageFactory;
import utility.ReusableUtils;

public class LeadProfilePage extends ReusableUtils {
    
    private AndroidDriver driver;
    public LeadProfilePage(AndroidDriver driver) {
        super(driver);
        this.driver = driver;
        PageFactory.initElements(new AppiumFieldDecorator(driver, java.time.Duration.ofSeconds(20)), this);
    }

    @AndroidFindBy(id = "com.amura.selldo.staging:id/text_lead_id")
    private WebElement leadID;
    @AndroidFindBy(id = "com.amura.selldo.staging:id/text_lead_name")
    private WebElement leadName;
    @AndroidFindBy(id = "com.amura.selldo.staging:id/text_owner")
    private WebElement leadOwnerName;

    public String getLeadID() {
        return waitUntilElementVisible(leadID).getText().trim();
    }

    public String getLeadOwnerName() {
        return waitUntilElementVisible(leadOwnerName).getText().replaceFirst("(?i)^\\s*Owner:\\s*", "").toLowerCase().trim();
    }

    public String getLeadName() {
        return waitUntilElementVisible(leadName).getText().toLowerCase().trim();
    }

}
