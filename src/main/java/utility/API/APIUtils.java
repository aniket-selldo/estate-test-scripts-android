package utility.API;

import io.restassured.RestAssured;
import io.restassured.config.HttpClientConfig;
import io.restassured.config.RestAssuredConfig;
import io.restassured.http.ContentType;
import io.restassured.response.Response;
import org.json.JSONArray;
import org.json.JSONObject;
import org.apache.commons.configuration2.Configuration;

import java.util.ArrayList;
import java.util.List;

public class APIUtils extends API_Reusable {
    
    private Configuration config;
    private String clientId;
    private String fullAccessApiKey;
    private String restrictedAccessApiKey;


	public APIUtils(Configuration config, String clientId, String fullAccessApiKey, String restrictedAccessApiKey) {
        super(config);
		this.config = config;
        this.clientId = clientId;
        this.fullAccessApiKey = fullAccessApiKey;
        this.restrictedAccessApiKey = restrictedAccessApiKey;
	}

	public JSONObject createLead(String phone,
								 String email,
								 String name,
								 String source,
								 String subSource,
								 String projectId,
								 List<String> projectIds,
								 String salesId,
								 String srd,
								 Boolean nri) {

		final String baseUrl = prop("URL"); 

		// Resolve project IDs into a normalized List<String>
		List<String> normalizedProjectIds = null;
		if (projectIds != null && !projectIds.isEmpty()) {
			normalizedProjectIds = sanitizeIds(projectIds);
		} else if (projectId != null && !projectId.isBlank()) {
			if (projectId.contains(",")) {
				String[] parts = projectId.split(",");
				List<String> ids = new ArrayList<>();
				for (String p : parts) {
					ids.add(p.trim().replace("\"", ""));
				}
				normalizedProjectIds = sanitizeIds(ids);
			} else {
				List<String> ids = new ArrayList<>();
				ids.add(projectId.trim().replace("\"", ""));
				normalizedProjectIds = sanitizeIds(ids);
			}
		}

		// Build payload
		JSONObject leadObj = new JSONObject();
		if (name != null) leadObj.put("name", name);
		if (phone != null) leadObj.put("phone", phone);
		if (email != null) leadObj.put("email", email);
		if (subSource != null) leadObj.put("sub_source", subSource);
		if (source != null) leadObj.put("source", source);
		if (normalizedProjectIds != null && !normalizedProjectIds.isEmpty()) {
			leadObj.put("project_id", new JSONArray(normalizedProjectIds));
		}
		if (salesId != null) leadObj.put("sales", salesId);
		if (nri != null) leadObj.put("nri", nri);

		JSONObject formObj = new JSONObject().put("lead", leadObj);
		JSONObject campaignObj = new JSONObject();
		if (srd != null) campaignObj.put("srd", srd);

		JSONObject sellDoObj = new JSONObject()
				.put("form", formObj)
				.put("campaign", campaignObj);

		JSONObject payload = new JSONObject()
				.put("sell_do", sellDoObj);
		if (restrictedAccessApiKey != null && !restrictedAccessApiKey.isBlank()) {
			payload.put("api_key", restrictedAccessApiKey);
		}

		// RestAssured timeout config (30s)
		RestAssuredConfig timeoutConfig = RestAssuredConfig.config().httpClient(
				HttpClientConfig.httpClientConfig()
						.setParam("http.connection.timeout", 30000)
						.setParam("http.socket.timeout", 30000)
						.setParam("http.connection-manager.timeout", 30000)
		);

		final int maxRetries = 3;
		Exception lastError = null;

		for (int attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				Response response = RestAssured
						.given()
						.config(timeoutConfig)
						.baseUri(baseUrl)
						.contentType(ContentType.JSON)
						.body(payload.toString())
						.post("/api/leads/create")
						.thenReturn();

				int status = response.getStatusCode();
				if (status >= 200 && status < 300) {
					return new JSONObject(response.asString());
				}

				lastError = new RuntimeException("Unexpected status: " + status + ", body: " + response.asString());
			} catch (Exception e) {
				lastError = e;
			}

			// Backoff: 1s, 2s, ...
			if (attempt < maxRetries) {
				try {
					Thread.sleep(1000L * attempt);
				} catch (InterruptedException ie) {
					Thread.currentThread().interrupt();
				}
			}
		}

		if (lastError instanceof RuntimeException re) {
			throw re;
		}
		throw new RuntimeException("Failed to create lead after " + maxRetries + " attempts.", lastError);
	}

	public JSONObject leadRetrieveByEmailOrPhone(String lead, boolean flagForDummyLead) {

		final String baseUrl = prop("URL");

		// Determine identifier type
		final boolean isEmail = lead != null && lead.contains("@");
		final String identifierType = isEmail ? "email" : "phone";

		// Normalize phone input similar to TS implementation
		String normalizedLead = lead == null ? "" : lead;
		if (!isEmail && normalizedLead.trim().length() > 10) {
			String trimmed = normalizedLead.replace("+", "").trim();
			if (trimmed.length() > 10) {
				trimmed = trimmed.substring(trimmed.length() - 10);
			}
			normalizedLead = trimmed;
		}

		// RestAssured timeout config (30s)
		RestAssuredConfig timeoutConfig = RestAssuredConfig.config().httpClient(
				HttpClientConfig.httpClientConfig()
						.setParam("http.connection.timeout", 30000)
						.setParam("http.socket.timeout", 30000)
						.setParam("http.connection-manager.timeout", 30000)
		);

		final String endpoint = "/api/leads/" + identifierType + "/retrieve_lead";
		final int maxRetries = 3;
		Exception lastError = null;

		for (int attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				Response response = RestAssured
						.given()
						.config(timeoutConfig)
						.baseUri(baseUrl)
						.contentType(ContentType.JSON)
						.queryParam("api_key", fullAccessApiKey)
						.queryParam("client_id", clientId)
						.queryParam("fetch_all_matching_leads", flagForDummyLead)
						.queryParam("value", normalizedLead)
						.get(endpoint)
						.thenReturn();

				int status = response.getStatusCode();
				if (status >= 200 && status < 300) {
					return new JSONObject(response.asString());
				}

				lastError = new RuntimeException("Unexpected status: " + status + ", body: " + response.asString());
			} catch (Exception e) {
				lastError = e;
			}

			// Backoff: 1s, 2s, ...
			if (attempt < maxRetries) {
				try {
					Thread.sleep(1000L * attempt);
				} catch (InterruptedException ie) {
					Thread.currentThread().interrupt();
				}
			}
		}

		if (lastError instanceof RuntimeException re) {
			throw re;
		}
		throw new RuntimeException("Failed to retrieve lead after " + maxRetries + " attempts.", lastError);
	}

}
