package LoginPage;

import io.appium.java_client.android.AndroidDriver;
import org.openqa.selenium.WebElement;
import io.appium.java_client.pagefactory.AndroidFindBy;
import io.appium.java_client.pagefactory.AppiumFieldDecorator;
import org.openqa.selenium.support.PageFactory;
import utility.ReusableUtils;
public class LoginPage extends ReusableUtils {

    private AndroidDriver driver;

    public LoginPage(AndroidDriver driver) {
        super(driver);
        this.driver = driver;
        PageFactory.initElements(new AppiumFieldDecorator(driver), this);
    }

    @AndroidFindBy(id = "com.amura.selldo.staging:id/input_email")
    private WebElement userName;
    @AndroidFindBy(id = "com.amura.selldo.staging:id/input_password")
    private WebElement password;
    @AndroidFindBy(id = "com.amura.selldo.staging:id/button_sign_in")
    private WebElement signUpButton;

    public void login(String userName, String password) {
        this.userName.sendKeys(userName);
        this.password.sendKeys(password);
        this.waitUntilElementClickable(signUpButton).click();
    }

}
