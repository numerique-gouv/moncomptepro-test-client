//

import { Given, Then, When } from "@badeball/cypress-cucumber-preprocessor";

//

Cypress.Cookies.debug(true);

//

Given("je navigue sur la page", () => {
  cy.visit("/");
});

When("je clique sur le bouton MonComptePro", () => {
  cy.get(".moncomptepro-button").click();
});

When("je suis redirigé sur {string}", (path: string) => {
  cy.url().should("contain", path);
});

Then("je vois {string}", function (text: string) {
  cy.contains(text);
});

//

When("je vois {string} sur moncomptepro", (_text: string) => {
  cy.origin(
    "https://app-test.moncomptepro.beta.gouv.fr",
    { args: _text },
    (text) => {
      cy.contains(text);
    },
  );
});

When("je click sur {string} sur moncomptepro", (_text: string) => {
  cy.origin(
    "https://app-test.moncomptepro.beta.gouv.fr",
    { args: _text },
    (text) => {
      cy.contains(text).click();
    },
  );
});

When(
  "je me connecte en tant que user@yopmail.com sur moncomptepro",
  (path: string) => {
    cy.origin("https://app-test.moncomptepro.beta.gouv.fr", () => {
      cy.get('[name="login"]').type("user@yopmail.com");
      cy.get('[type="submit"]').click();

      cy.get('[name="password"]').type("user@yopmail.com");
      cy.get('[action="/users/sign-in"]  [type="submit"]')
        .contains("Se connecter")
        .click();
    });
  },
);
