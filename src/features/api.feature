@api
Feature: REST API Testing with Playwright
  Demonstrates Playwright's APIRequestContext for REST API validation,
  integrated into the same Cucumber BDD framework as the UI tests.
  Target: https://jsonplaceholder.typicode.com (public test API, no auth required)

  @smoke
  Scenario: Fetch a single resource by ID
    When I send a GET request to "/todos/1"
    Then the response status should be 200
    And the response should have field "userId"
    And the response should have field "title"

  @regression
  Scenario: Create a new resource
    When I send a POST request to "/posts" with body:
      """
      {"title": "Portfolio showcase", "body": "Playwright API test", "userId": 1}
      """
    Then the response status should be 201
    And the response field "title" should equal "Portfolio showcase"

  @regression
  Scenario: List resources with query parameters
    When I send a GET request to "/todos?_limit=5"
    Then the response status should be 200
    And the response should contain 5 items
