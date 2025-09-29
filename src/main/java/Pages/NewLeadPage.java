package Pages;

import io.appium.java_client.AppiumBy;
import io.appium.java_client.android.AndroidDriver;
import org.openqa.selenium.WebElement;
import io.appium.java_client.pagefactory.AndroidFindBy;
import io.appium.java_client.pagefactory.AppiumFieldDecorator;
import org.openqa.selenium.support.PageFactory;
import org.openqa.selenium.By;
import utility.ReusableUtils;

public class NewLeadPage extends ReusableUtils {

    private AndroidDriver driver;

    public NewLeadPage(AndroidDriver driver) {
        super(driver);
        this.driver = driver;
        PageFactory.initElements(new AppiumFieldDecorator(driver), this);
    }

    @AndroidFindBy(id = "com.amura.selldo.staging:id/input_salutation")
    private WebElement inputSalutation;

    @AndroidFindBy(id = "com.amura.selldo.staging:id/input_first_name")
    private WebElement leadFirstName;

    @AndroidFindBy(id = "com.amura.selldo.staging:id/input_last_name")
    private WebElement leadLastName;

    @AndroidFindBy(id = "com.amura.selldo.staging:id/input_email_type")
    private WebElement inputEmailType;

    @AndroidFindBy(id = "com.amura.selldo.staging:id/input_email")
    private WebElement leadEmail;

    @AndroidFindBy(id = "com.amura.selldo.staging:id/text_add_email")
    private WebElement addEmailLink;

    @AndroidFindBy(id = "com.amura.selldo.staging:id/input_phone_type")
    private WebElement inputPhoneType;

    @AndroidFindBy(id = "com.amura.selldo.staging:id/input_country_code")
    private WebElement inputCountryCode;

    @AndroidFindBy(id = "com.amura.selldo.staging:id/input_phone")
    private WebElement leadPhone;

    @AndroidFindBy(id = "com.amura.selldo.staging:id/text_add_phone")
    private WebElement addPhoneLink;

    @AndroidFindBy(id = "com.amura.selldo.staging:id/input_time_zone")
    private WebElement inputTimeZone;

    @AndroidFindBy(id = "com.amura.selldo.staging:id/input_country_name")
    private WebElement inputCountryName;

    @AndroidFindBy(id = "com.amura.selldo.staging:id/input_teams")
    private WebElement inputTeams;

    @AndroidFindBy(id = "com.amura.selldo.staging:id/input_campaign")
    private WebElement inputCampaign;

    @AndroidFindBy(id = "com.amura.selldo.staging:id/positive_button_dialog")
    private WebElement dialogPositiveButton;

    @AndroidFindBy(id = "com.amura.selldo.staging:id/button_add_lead")
    private WebElement buttonSave;

    @AndroidFindBy(accessibility = "Basic Profile")
    private WebElement tabBasicProfile;

    @AndroidFindBy(accessibility = "Requirement")
    private WebElement tabRequirement;

    @AndroidFindBy(accessibility = "Personal Details")
    private WebElement tabPersonalDetails;



    public void openBasicProfileTab(){
        safeClick(tabBasicProfile);
    }

    public void openRequirementTab(){
        safeClick(tabRequirement);
    }

    public void openPersonalDetailsTab(){
        safeClick(tabPersonalDetails);
    }

    public void setSalutation(String salutation){
        clearAndType(inputSalutation, salutation);
    }

    public void enterFirstName(String firstName){
        leadFirstName.sendKeys(firstName);
    }

    public void enterLastName(String lastName){
        leadLastName.sendKeys(lastName);
    }

    public void setEmailType(String type){
        clearAndType(inputEmailType, type);
    }

    public void enterEmail(String email){
        leadEmail.sendKeys(email);
    }

    public void setPhoneType(String type){
        clearAndType(inputPhoneType, type);
    }

    public void enterCountryCode(String countryCode){
        clearAndType(inputCountryCode,countryCode);
    }

    public void enterPhoneNumber(String phoneNumber){
        leadPhone.sendKeys(phoneNumber);
    }

    public void setTimeZone(String timeZone){
        clearAndType(inputTimeZone, timeZone);
    }

    public void setCountryName(String countryName){
        clearAndType(inputCountryName, countryName);
    }

    public void setTeams(String teams){
        clearAndType(inputTeams, teams);
    }

    public void tapSave(){
        safeClick(buttonSave);
    }

    public boolean isOnBasicProfile(){
        return isDisplayed(tabBasicProfile);
    }

    public void addAnotherEmail(){
        safeClick(addEmailLink);
    }

    public void addAnotherPhone(){
        safeClick(addPhoneLink);
    }

    public void tapSaveAndWaitUntilGone(){
        safeClick(buttonSave);
        waitUntilElementInvisible(By.id("com.amura.selldo.staging:id/button_add_lead"));
    }

    public void setCampaign(String campaignName){
        scrollToText("Walkin");
        safeClick(inputCampaign);
        scrollToText("Organic");
        safeClick(driver.findElement(AppiumBy.xpath("//android.widget.TextView[@content-desc='Sell.Do Dev' and @text='"+campaignName+"']")));
        safeClick(dialogPositiveButton);
    }



}
