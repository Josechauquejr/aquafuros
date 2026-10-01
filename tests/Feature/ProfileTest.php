<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_profile_page_is_displayed(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->get('/profile');

        $response->assertOk();
    }

    public function test_profile_information_can_be_updated(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch('/profile', [
                'name' => 'Test User',
                'email' => 'test@example.com',
                'current_password' => 'password',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/profile');

        $user->refresh();

        $this->assertSame('Test User', $user->name);
        $this->assertSame('test@example.com', $user->email);
        $this->assertNull($user->email_verified_at);
    }

    public function test_email_verification_status_is_unchanged_when_the_email_address_is_unchanged(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch('/profile', [
                'name' => 'Test User',
                'email' => $user->email,
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/profile');

        $this->assertNotNull($user->refresh()->email_verified_at);
    }

    public function test_user_can_delete_their_account(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->delete('/profile', [
                'password' => 'password',
                'confirmacao' => 'ELIMINAR',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/');

        $this->assertGuest();
        $this->assertSoftDeleted($user);
    }

    public function test_correct_password_must_be_provided_to_delete_account(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->from('/profile')
            ->delete('/profile', [
                'password' => 'wrong-password',
                'confirmacao' => 'ELIMINAR',
            ]);

        $response
            ->assertSessionHasErrorsIn('userDeletion', 'password')
            ->assertRedirect('/profile');

        $this->assertNotNull($user->fresh());
    }

    public function test_changing_email_requires_the_current_password(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->from('/profile')
            ->patch('/profile', ['name' => $user->name, 'email' => 'novo@example.com'])
            ->assertSessionHasErrors('current_password');

        $this->assertNotSame('novo@example.com', $user->fresh()->email);

        $this->actingAs($user)
            ->patch('/profile', ['name' => $user->name, 'email' => 'novo@example.com', 'current_password' => 'wrong'])
            ->assertSessionHasErrors('current_password');
    }

    public function test_changing_only_the_name_does_not_ask_for_the_password(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->patch('/profile', ['name' => 'Outro Nome', 'email' => $user->email])
            ->assertSessionHasNoErrors();

        $this->assertSame('Outro Nome', $user->fresh()->name);
    }

    public function test_deleting_the_account_requires_typing_the_confirmation_word(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->from('/profile')
            ->delete('/profile', ['password' => 'password', 'confirmacao' => 'eliminar'])
            ->assertSessionHasErrorsIn('userDeletion', 'confirmacao');

        $this->assertNotNull($user->fresh());
    }

    public function test_the_only_administrator_cannot_delete_their_own_account(): void
    {
        $this->seed(RoleSeeder::class);
        $admin = User::factory()->create();
        $admin->assignRole('administrador');

        $this->actingAs($admin)
            ->from('/profile')
            ->delete('/profile', ['password' => 'password', 'confirmacao' => 'ELIMINAR'])
            ->assertSessionHasErrorsIn('userDeletion', 'password');

        $this->assertNotNull($admin->fresh());
    }
}
