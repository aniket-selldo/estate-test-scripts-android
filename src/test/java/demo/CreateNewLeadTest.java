package demo;

import Pages.DashBoardPage;
import Pages.AllLeadPage;
import org.testng.annotations.Test;
import Pages.LoginPage;
import Pages.PopupPages;
import Pages.NewLeadPage;
import utility.BaseTest;

public class CreateNewLeadTest extends BaseTest {
	
	@Test
	public void createNewLeadWithOnlyPhone() throws InterruptedException  {
		
		LoginPage loginPage = new LoginPage(driver);
		PopupPages popupPages = new PopupPages(driver);
		DashBoardPage dashBoardPage = new DashBoardPage(driver);
		AllLeadPage allLeadPage = new AllLeadPage(driver);
		NewLeadPage newLeadPage = new NewLeadPage(driver);

		loginPage.login("aniket.khandizod+sales@sell.do", "amura@123");
		popupPages.clickWhatsNewPopup();

		dashBoardPage.clickOnNewEnquiryButton();
		allLeadPage.clickOnAddButton();

		newLeadPage.setSalutation("Mr.");
		newLeadPage.enterFirstName(Random("A", 10));
		newLeadPage.enterLastName(Random("A", 10));
		newLeadPage.setPhoneType("Mobile");
		newLeadPage.enterPhoneNumber(randomPhone());
		newLeadPage.setCampaign("Organic");
		newLeadPage.tapSaveLeadButton();
	} 

	@Test
	public void createNewLeadWithOnlyEmail() throws InterruptedException  {
		
		LoginPage loginPage = new LoginPage(driver);
		PopupPages popupPages = new PopupPages(driver);
		DashBoardPage dashBoardPage = new DashBoardPage(driver);
		AllLeadPage allLeadPage = new AllLeadPage(driver);
		NewLeadPage newLeadPage = new NewLeadPage(driver);

		loginPage.login("aniket.khandizod+sales@sell.do", "amura@123");
		popupPages.clickWhatsNewPopup();

		dashBoardPage.clickOnNewEnquiryButton();
		allLeadPage.clickOnAddButton();

		newLeadPage.setSalutation("Mr.");
		newLeadPage.enterFirstName(Random("A", 10));
		newLeadPage.enterLastName(Random("A", 10));
		newLeadPage.setEmailType("Personal");
		newLeadPage.enterEmail(randomEmail());
		newLeadPage.setCampaign("Organic");
		newLeadPage.tapSaveLeadButton();
	} 
}

