@a11y @regression
Feature: Accessibility
  Automated WCAG 2.1 A/AA scan with axe-core. Violations that already exist are
  listed in a11y/baseline.json; only new ones fail the scenario.

  Background:
    Given I am on the TodoMVC application

  Scenario: Empty todo list
    Then the page should have no new accessibility violations

  Scenario: List with active and completed todos
    Given I have added a todo "Buy milk"
    And I have added a todo "Walk the dog"
    When I complete todo number 1
    Then the page should have no new accessibility violations

  Scenario: Completed filter view
    Given I have added a todo "Buy milk"
    And I have added a todo "Walk the dog"
    When I complete todo number 1
    And I filter todos by "Completed"
    Then the page should have no new accessibility violations
