package demo;

import Pages.DashBoardPage;
import Pages.AllLeadPage;
import org.testng.annotations.Test;
import Pages.LoginPage;
import Pages.PopupPages;
import Pages.NewLeadPage;
import utility.BaseTest;
import utility.API.APIUtils;
import org.json.JSONObject;
import Pages.CommonPages;
import Pages.LeadProfilePage;
import org.testng.Assert;
public class CreateNewLeadTest extends BaseTest {
	
	//@Test
	public void createNewLeadWithOnlyPhone() throws InterruptedException  {
		
		LoginPage loginPage = new LoginPage(driver);
		PopupPages popupPages = new PopupPages(driver);
		DashBoardPage dashBoardPage = new DashBoardPage(driver);
		AllLeadPage allLeadPage = new AllLeadPage(driver);
		NewLeadPage newLeadPage = new NewLeadPage(driver);

		loginPage.login(prop("Sales_Email_01"), prop("Password"));
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

	//@Test
	public void createNewLeadWithOnlyEmail() throws InterruptedException  {
		
		LoginPage loginPage = new LoginPage(driver);
		PopupPages popupPages = new PopupPages(driver);
		DashBoardPage dashBoardPage = new DashBoardPage(driver);
		AllLeadPage allLeadPage = new AllLeadPage(driver);
		NewLeadPage newLeadPage = new NewLeadPage(driver);

		loginPage.login(prop("Sales_Email_01"), prop("Password"));
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

	//@Test
	public void createNewLeadWithOnlyEmailAndPhone() throws InterruptedException  {
		
		LoginPage loginPage = new LoginPage(driver);
		PopupPages popupPages = new PopupPages(driver);
		DashBoardPage dashBoardPage = new DashBoardPage(driver);
		AllLeadPage allLeadPage = new AllLeadPage(driver);
		NewLeadPage newLeadPage = new NewLeadPage(driver);

		loginPage.login(prop("Sales_Email_01"), prop("Password"));
		popupPages.clickWhatsNewPopup();

		dashBoardPage.clickOnNewEnquiryButton();
		allLeadPage.clickOnAddButton();

		newLeadPage.setSalutation("Mr.");
		newLeadPage.enterFirstName(Random("A", 10));
		newLeadPage.enterLastName(Random("A", 10));
		newLeadPage.setPhoneType("Mobile");
		newLeadPage.enterPhoneNumber(randomPhone());
		newLeadPage.setEmailType("Personal");
		newLeadPage.enterEmail(randomEmail());
		newLeadPage.setCampaign("Organic");
		newLeadPage.tapSaveLeadButton();
	} 

	@Test
	public void globalSearchLeadWithEmailPhoneAndName() throws InterruptedException  {
		
		LoginPage loginPage = new LoginPage(driver);
		PopupPages popupPages = new PopupPages(driver);
		DashBoardPage dashBoardPage = new DashBoardPage(driver);
		AllLeadPage allLeadPage = new AllLeadPage(driver);
		NewLeadPage newLeadPage = new NewLeadPage(driver);
		CommonPages commonPages = new CommonPages(driver);
		LeadProfilePage leadProfilePage = new LeadProfilePage(driver);

		APIUtils apiUtils = new APIUtils(props, prop("Client_Id"), prop("FullAccess_API"), prop("RestrictedAccess_API"));
		String phone = randomPhone();
		String email = randomEmail();
		String fname = Random("A", 10);
		String lname = Random("A", 10);
		JSONObject resp =apiUtils.createLead(phone, email, fname + " " + lname, "", "", "",null,prop("Sales_Id"), "", null);
		String leadId = resp.getString("sell_do_lead_id");

		loginPage.login(prop("Sales_Email_01"), prop("Password"));
		popupPages.clickWhatsNewPopup();

		dashBoardPage.clickOnNewEnquiryButton();

		commonPages.clickOnSearchButtonOnAllLeadsPage(email);

		String leadIdFromProfilePage = leadProfilePage.getLeadID();
		Assert.assertEquals("#"+leadId,leadIdFromProfilePage);
	} 
}

